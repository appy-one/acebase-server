var connection = {
    dbname: 'none',
    username: 'anonymous',
    db: null,
    user: null,
    auth_token: ''
};

function connect(dbname, username, password) {
    let createNew = connection.db === null || connection.dbname !== dbname;
    if (createNew) {
        connection.db && connection.db.disconnect();
        connection.db = new AceBaseClient({ dbname, host: location.hostname, port: location.port, https: location.protocol === 'https:', autoConnect: true });
    }
    return connection.db.ready()
    .then(() => {
        if (username) {
            // Only sign in when credentials are passed
            return connection.db.auth.signIn(username, password);
        }
        else {
            return null;
        }
    })
    .then(signInDetails => {
        connection.dbname = dbname;
        if (signInDetails === null) {
            return;
        }
        connection.user = signInDetails.user;
        connection.auth_token = signInDetails.accessToken;
        connection.username = (signInDetails && signInDetails.user.displayName) || username;
    });
}

function getChildPath (path, childKey) {
    const isIndex = typeof childKey === 'number';
    const trailPath = isIndex ? '[' + childKey + ']' : '/' + childKey;
    const childPath = path ? path + trailPath : childKey;
    return childPath;
}

function getPathKeys(path) {
    if (typeof path === 'undefined' || path.length === 0) { return []; }
    let keys = path.replace(/\[/g, "/[").split("/");
    keys.forEach((key, index) => {
        if (key.startsWith("[")) { 
            keys[index] = parseInt(key.substr(1, key.length - 2)); 
        }
    });
    return keys;
}

/**
 * 
 * @param {string} path 
 * @param {(event: 'changed'|'removed'|'added', childRef) => any} callback 
 */
function subscribeToChildEvents(path, callback) {
    // Create 3 subscriptions, combine them into 1
    path = path || '';
    const ref = connection.db.ref(path);

    // Subscribe to events
    const changes = ref.on('notify_child_changed').subscribe(ref => callback('changed', ref));
    const adds = ref.on('notify_child_added').subscribe(ref => callback('added', ref));
    const removes = ref.on('notify_child_removed').subscribe(ref => callback('removed', ref));

    function stop() {
        // Unsubscribe
        changes.stop();
        adds.stop();
        removes.stop();      
    }

    return { stop };
}

let currentPath = null;
let currentPathSubscription = null;
let currentPathIsArray = false;
let lastMoreClickListener;
function updateBrowsePath(path = '') {

    if (currentPath !== path) {
        if (currentPathSubscription) {
            // unsubscribe from previous subscription
            currentPathSubscription.stop();
        }
        currentPathSubscription = subscribeToChildEvents(path, (event, ref) => {
            // M.toast({ html: `Child "${ref.key}" ${event}` });
            clearErrors();
            if (event === 'removed') {
                removeNode({ key: ref.key });
            }
            else {
                ref.reflect('info', { child_limit: 0, child_skip: 0, impersonate: impersonatedUid })
                .then(event === 'changed' ? updateNode : addNode);
            }
        });
    }
    currentPath = path;
    const impersonatedUid = document.getElementById('impersonate_uid').value;

    const container = document.getElementById('browse_container');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    const breadcrumbContainer = document.getElementById('browse_breadcrumb_container');
    while (breadcrumbContainer.firstChild) {
        breadcrumbContainer.removeChild(breadcrumbContainer.firstChild);
    }

    const pathKeys = getPathKeys(path);
    let parentPath = '';
    pathKeys.forEach(key => {
        const breadcrumbNode = document.createElement('a');
        breadcrumbNode.className = 'browse_breadcrumb_node';
        breadcrumbNode.textContent = key;
        let childPath = getChildPath(parentPath, key);
        breadcrumbNode.addEventListener('click', updateBrowsePath.bind(this, childPath))
        breadcrumbContainer.appendChild(breadcrumbNode);
        parentPath = childPath;
    });

    function createNode(nodeInfo) {
        const childElem = document.createElement('div');
        childElem.id = 'child_' + nodeInfo.key;
        childElem.classList.add('db_node');
        const isObjectOrArray = ['object', 'array'].includes(nodeInfo.type);
        const hasInlineValue = typeof nodeInfo.value !== 'undefined';
        if (isObjectOrArray && !hasInlineValue) {
            childElem.classList.add('db_node_expand');
            // add_box
            // indeterminate_check_box?
            const childPath = getChildPath(path, nodeInfo.key);
            childElem.addEventListener('click', updateBrowsePath.bind(this, childPath));
        }

        const nodeNameElem = document.createElement('span');
        nodeNameElem.className = 'db_node_name';
        nodeNameElem.textContent = nodeInfo.key;
        if (typeof nodeInfo.access === 'object') {
            nodeNameElem.classList.add('access_mode');
            nodeNameElem.classList.add(nodeInfo.access.read ? 'allow_read' : 'deny_read');
            nodeNameElem.classList.add(nodeInfo.access.write ? 'allow_write' : 'deny_write');
        }
        childElem.appendChild(nodeNameElem);

        if (hasInlineValue) {
            const nodeValueElem = document.createElement('span');
            nodeValueElem.className = 'db_node_inlinevalue';
            let displayValue = nodeInfo.value;
            if (nodeInfo.type === 'string') {
                displayValue = `"${displayValue}"`;
            }
            else if (nodeInfo.type === 'reference') {
                displayValue = `(ref to:) "${displayValue.path}"`;
            }
            else if (nodeInfo.type === 'date') {
                displayValue = new Date(displayValue).toString();
            }
            else if (nodeInfo.type === 'object') {
                displayValue = '{}';
            }
            else if (nodeInfo.type === 'array') {
                displayValue = '[]';
            }
            else if (nodeInfo.type === 'binary') {
                nodeValueElem.className = 'db_node_type';
                displayValue = nodeInfo.type; //'(binary value)';
            }
            nodeValueElem.textContent = displayValue;
            childElem.appendChild(nodeValueElem);
        }
        else if (!isObjectOrArray) {
            const canLoadValue = ['string','reference'].includes(nodeInfo.type)
            const nodeTypeElem = document.createElement(canLoadValue ? 'a' : 'span');
            nodeTypeElem.className = 'db_node_type';
            if (canLoadValue) { nodeTypeElem.classList.add('clickable'); }
            nodeTypeElem.textContent = nodeInfo.type;
            canLoadValue && nodeTypeElem.addEventListener('click', () => {
                // load and display value
                const childPath = getChildPath(path, nodeInfo.key);
                connection.db.ref(childPath).get(snap => {
                    let val = snap.val();
                    if (val === null) { val = 'null'; }
                    else if (nodeInfo.type === 'string') { val = `"${val}"`; }
                    else if (nodeInfo.type === 'reference') { val = `${val.path}`; }

                    const nodeValueElem = document.createElement('span');
                    nodeValueElem.className = 'db_node_inlinevalue';
                    nodeValueElem.textContent = val;

                    // replace node
                    nodeTypeElem.parentElement.replaceChild(nodeValueElem, nodeTypeElem);
                });
            })
            childElem.appendChild(nodeTypeElem);
        }

        return childElem;
    }

    function addNode(nodeInfo, noFlash = false) {
        console.log(`Adding node ${nodeInfo.key}:`, nodeInfo);
        const childElem = createNode(nodeInfo);
        if (!noFlash) { childElem.classList.add('flash'); }
        container.appendChild(childElem);
    }
    function updateNode(nodeInfo) {
        const id = 'child_' + nodeInfo.key;
        const currentElem = document.getElementById(id);
        if (currentElem) { currentElem.id = 'prev_' + id; }
        const newElem = createNode(nodeInfo);
        newElem.classList.add('flash');
        if (currentElem) {
            container.replaceChild(newElem, currentElem);
        }
        else {
            container.appendChild(newElem);
        }
    }
    function removeNode(nodeInfo) {
        const id = 'child_' + nodeInfo.key;
        const currentElem = document.getElementById(id);
        currentElem && currentElem.remove();
        if (container.children.length === 0) {
            // Node is either gone or has no more children. Refresh info
            updateBrowsePath(path);
        }
    }

    function showError(message) {
        const errorElem = document.createElement('div');
        errorElem.className = 'error';
        errorElem.textContent = message;
        container.appendChild(errorElem);
        document.getElementById('browse_impersonate_access').className = '';
        document.getElementById('more_children').className = '';
    }
    function clearErrors() {
        container.querySelectorAll('div.error').forEach(elem => elem.remove());
    }

    let ref = path ? connection.db.ref(path) : connection.db.root;
    const limit = 100; 
    function getChildren(skip = 0) {
        // Load path children with reflect API
        ref.reflect('info', { child_limit: limit, child_skip: skip, impersonate: impersonatedUid })
        .then(info => {

            currentPathIsArray = info.type === 'array';

            if (info.impersonation) {
                const elem = document.getElementById('browse_impersonate_access');
                if (info.impersonation.read.allow && info.impersonation.write.allow) {
                    elem.className = 'access_allow_read_write';
                }
                else if (info.impersonation.read.allow) {
                    elem.className = 'access_allow_read';
                }
                else if (info.impersonation.write.allow) {
                    elem.className = 'access_allow_write';
                }
                else {
                    elem.className = 'access_deny';
                }
            }
            else {
                document.getElementById('browse_impersonate_access').className = '';
            }

            if (!info.exists) {
                return showError('node does not exist');
            }
            else if (info.children.list.length === 0) {
                return showError('node has no children');
            }

            if (skip === 0 && !info.children.more) {
                // we've got all children, sort the list
                info.children.list.sort((a,b) => a.key < b.key ? -1 : 1);
            }

            // Add children
            info.children.list.forEach(childInfo => {
                addNode(childInfo, true);
            });

            // Is there more data?
            const moreElem = document.getElementById('more_children');
            moreElem.className = info.children.more ? 'visible' : '';
            const loadMoreElem = document.getElementById('load_more_children');
            lastMoreClickListener && loadMoreElem.removeEventListener('click', lastMoreClickListener);
            lastMoreClickListener = () => {
                getChildren(skip + limit);
            };
            loadMoreElem.addEventListener('click', lastMoreClickListener);

            // Enable export?
            const exportAvailable = ['object','array'].includes(info.type);
            const exportNode = document.getElementById('export_node');
            if (exportAvailable) { exportNode.classList.remove('hide'); }
            else { exportNode.classList.add('hide'); }
        })
        .catch(err => {
            // Server error?
            showError('Error: ' + err.message);
        });
    }
    getChildren(0);
}

function setSpans(className, value) {
    const elems = document.getElementsByClassName(className);
    for (let i = 0; i < elems.length; i++) {
        elems.item(i).textContent = value;
    }
}

function connectionChanged(success) {
    if (!success) {
        return;
    }
    setSpans('connected_user', connection.username);
    setSpans('connected_db', connection.dbname);

    let tabs = M.Tabs.getInstance(document.getElementById('main_tabs'));
    tabs.select('browse');

    updateBrowsePath();
}

function impersonateUser() {
    const impersonateElem = document.getElementById('impersonate_uid');
    let uid = window.prompt('Enter the user id (uid) to impersonate:', impersonateElem.value);
    let impersonating = false;
    if (uid === '') { uid = 'anonymous'; }
    if (uid) {
        impersonating = true;
    }
    impersonateElem.value = uid || '';
    document.getElementById('impersonate_disabled').style.display = impersonating ? 'none' : 'inline';
    document.getElementById('impersonate_enabled').style.display = impersonating ? 'inline' : 'none';
    setSpans('impersonate_uid_label', impersonateElem.value);
    updateBrowsePath(currentPath);
}

function specifyChildKey() {
    let key = window.prompt('Enter the child key to browse to:', '');
    if (typeof key !== 'string') { return; }
    if (currentPathIsArray && /^[0-9]+$/.test(key)) {
        // index
        key = parseInt(key);
    }
    const targetPath = getChildPath(currentPath, key);
    updateBrowsePath(targetPath);
}

document.getElementById('connect_button').addEventListener('click', () => {
    const successLabel = document.getElementById('connect_success');
    const failLabel = document.getElementById('connect_fail');
    const failReasonLabel = document.getElementById('fail_reason');
    successLabel.classList.add('hide');
    failLabel.classList.add('hide');
    
    const dbname = document.getElementById('dbname').value;
    const username = document.getElementById('username').value; //'admin'
    const password = document.getElementById('password').value;

    if (username !== 'admin') {
        M.toast({html: 'Sorry! Only the admin user can currently use this interface'});
        return;
    }

    connect(dbname, username, password)
    .then(() => {
        successLabel.classList.remove('hide');
        connectionChanged(true);
    })
    .catch(err => {
        failLabel.classList.remove('hide');
        failReasonLabel.textContent = err.message;
        connectionChanged(false);
    });
});

document.getElementById('browse_breadcrumb_root').addEventListener('click', () => {
    updateBrowsePath('');
});

document.getElementById('export_json').addEventListener('click', () => {
    // Will initiate a download:
    const url = `/export/${connection.dbname}/${currentPath}?format=json&auth_token=${connection.auth_token}`;
    window.location.href = url;
});

document.getElementById('edit_node').addEventListener('click', () => {
    document.getElementById('edit_form').classList.remove('hide');
});

document.getElementById('update_button').addEventListener('click', () => {
    // 
    const textarea = document.getElementById('update_json');
    let json = textarea.value;
    if (!json.startsWith('{') || !json.endsWith('}')) { return alert('Value must be json'); }
    
    // TODO: Find a secure way to replace dates
    // // Replace date strings with dates
    // json = json.replace(/"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?Z"/g, m => `new Date(${m})`);
    // // Parse object
    // const updates = eval(`(${json})`); // eval to allow JS, eg: new Date("2021-04-13T20:03:02.735Z")
    // Parse object

    let updates;
    try {
        updates = JSON.parse(json);
    }
    catch(err) {
        return alert(err.message);
    }
    
    console.log(updates);
    if (typeof updates !== 'object') { return alert('value must be an object'); }
    // Update
    connection.db.ref(currentPath).update(updates)
    // .then(() => {
    //     M.toast({ html: `Value was updated!` });
    // })
    .catch(err => {
        M.toast({ html: `Error: ${err.message}` });
    });
});

// TODO: create a stand-alone PWA (Ionic?) that has more functionality, such as:
// - connecting to multiple servers
// - edit data
// - create (and store) queries on data
// - monitoring
// - editing rules
// - managing users
// - etc!