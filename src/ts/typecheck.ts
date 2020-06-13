interface IType {
    typeOf: string, // typeof
    instanceOf?: Function, // eg: instanceof 'Array'
    value?:string|number|boolean|null,
    genericTypes?: IType[],
    children?: IProperty[]
}

interface IProperty {
    name: string,
    optional: boolean,
    types: IType[]
}

// parses a typestring, creates checker functions 
function parse(definition: string) {
    // tokenize
    let pos = 0;
    function consumeSpaces() {
        let c;
        while (c = definition[pos], [' ','\r','\n','\t'].includes(c)) { pos++; }
    }
    function consumeCharacter(c) {
        if (definition[pos] !== c) {
            throw new Error(`Unexpected character at position ${pos}. Expected: '${c}', found '${definition[pos]}'`);
        }
        pos++;
    }
    function readProperty() {
        consumeSpaces();
        let prop = { name: '', optional: false }, c;
        while (c = definition[pos], c==='_' || c==='$' || (c>='a' && c<='z') || (c>='A' && c<='Z') || (prop.name.length > 0 && c>='0' && c<='9')) {
            prop.name += c;
            pos++;
        }
        if (prop.name.length === 0) {
            throw new Error(`Property name expected at position ${pos}`);
        }
        if (definition[pos] === '?') {
            prop.optional = true;
            pos++;
        }
        consumeSpaces();
        consumeCharacter(':');
        return prop;
    }
    function readType() {
        consumeSpaces();
        let type: IType = { typeOf: 'any' }, c;
        
        // try reading simple type first: (string,number,boolean,Date etc)
        let name = '';
        while (c = definition[pos], (c>='a' && c<='z') || (c>='A' && c<='Z')) {
            name += c;
            pos++;
        }
        
        if (name.length === 0) {

            if (definition[pos] === '*') {
                // any value
                consumeCharacter('*');
                type.typeOf = 'any';
            }
            else if ([`'`,`"`,'`'].includes(definition[pos])) {
                // Read string value
                type.typeOf = 'string';
                type.value = '';
                const quote = definition[pos];
                consumeCharacter(quote);
                while(c = definition[pos], c !== quote) {
                    type.value += c;
                    pos++;
                }
                consumeCharacter(quote);
            }
            else if (definition[pos] >= '0' && definition[pos] <= '9') {
                // read numeric value
                type.typeOf = 'number';
                let nr = '';
                while(c = definition[pos], c==='.' || (c>='0' && c<='9')) {
                    nr += c;
                    pos++;
                }
                type.value = nr.includes('.') ? parseFloat(nr) : parseInt(nr);
            }
            else if (definition[pos] === '{') {
                // Read object definition
                consumeCharacter('{');
                type.typeOf = 'object';
                // No need to: type.instanceOf = 'Object';
                // Read children:
                type.children = [];
                while (true) {
                    const prop = readProperty();
                    const types = readTypes();
                    type.children.push({ name: prop.name, optional: prop.optional, types });
                    consumeSpaces();
                    if (definition[pos] === '}') { break; }
                    consumeCharacter(',');
                }
                consumeCharacter('}');
            }
            else {
                throw new Error(`Expected a type definition at position ${pos}, found character '${definition[pos]}'`);
            }
        }
        else if (['string','number','boolean','undefined'].includes(name)) {
            type.typeOf = name;
        }
        else if (name === 'Object') {
            type.typeOf = 'object';
            type.instanceOf = Object;
        }
        else if (name === 'Date') {
            type.typeOf = 'object';
            type.instanceOf = Date;
        }
        else if (name === 'any') {
            type.typeOf = 'any';
        }
        else if (name === 'null') {
            // This is ignored, null values are not stored in the db (null indicates deletion)
            type.typeOf = 'object';
            type.value = null;
        }
        else if (name === 'Array') {
            // Read generic Array defintion
            consumeCharacter('<');
            type.typeOf = 'object';
            type.instanceOf = Array; //name;
            type.genericTypes = readTypes();
            consumeCharacter('>');
        }
        else if ([`'`,`"`].includes(name[0]) && name.slice(-1) == name[0]) {
            type.typeOf = 'string';
            type.value = name.slice(1, -1);
        }
        else if (['true','false'].includes(name)) {
            type.typeOf = 'boolean';
            type.value = name === 'true';
        }
        else {
            throw new Error(`Unknown type at position ${pos}: "${type}"`);
        }

        // Check if it's an Array of given type (eg: string[] or string[][])
        // Also converts to generics, string[] becomes Array<string>, string[][] becomes Array<Array<string>>
        consumeSpaces();
        while (definition[pos] === '[') { 
            consumeCharacter('[');
            consumeCharacter(']');
            type = { typeOf: 'object', instanceOf: Array, genericTypes: [type] };
        }
        return type; 
    }
    function readTypes() {
        consumeSpaces();
        const types = [readType()];
        while (definition[pos] === '|') {
            consumeCharacter('|');
            types.push(readType());
            consumeSpaces();
        }
        return types;
    }
    return readType();
}

function checkObject(path: string, properties: IProperty[], obj: Object, partial: boolean) {
    // Are there any properties that should not be in there?
    const invalidProperties = Object.keys(obj).filter(key => ![null,undefined].includes(obj[key]) && !!properties.find(prop => prop.name === key));
    if (invalidProperties.length > 0) {
        return { ok: false, reason: `Object at path "${path}" cannot have properties ${invalidProperties.map(p => `"${p}"`).join(', ')}`}
    }
    // Loop through properties that should be present
    function checkProperty(property: IProperty) {
        const hasValue = ![null,undefined].includes(obj[property.name]);
        if (!property.optional && !hasValue && !partial) {
            return { ok: false, reason: `Property at path "${path}/${property.name}" is not optional` };
        }
        if (hasValue && property.types.length === 1) {
            return checkType(`${path}/${property.name}`, property.types[0], obj[property.name], false);
        }
        if (hasValue && !property.types.some(type => checkType(`${path}/${property.name}`, type, obj[property.name], false).ok)) {
            return { ok: false, reason: `Property at path "${path}/${property.name}" is of the wrong type` };
        }
        return { ok: true };
    }
    const failedProperty = properties.find(prop => !checkProperty(prop).ok);
    if (failedProperty) {
        const reason = checkProperty(failedProperty).reason;
        return { ok: false, reason };
    }
    return { ok: true };
}

function checkType(path: string, type: IType, value: any, partial: boolean) {
    if (value === null) {
        return { ok: true };
    }
    if (type.typeOf !== 'any' && typeof value !== type.typeOf) {
        return { ok: false, reason: `"${path}" must be typeof ${type.typeOf}` };
    }
    if (type.instanceOf && (typeof value !== 'object' || !(value instanceof type.instanceOf))) { // value.constructor.name !== type.instanceOf
        return { ok: false, reason: `"${path}" must be instanceof ${type.instanceOf}` };
    }
    if ('value' in type && value !== type.value) {
        return { ok: false, reason: `"${path}" must be value: ${type.value}` };
    }
    if (type.instanceOf === Array && type.genericTypes && !(value as Array<any>).every(v => type.genericTypes.some(t => checkType(path, t, v, false).ok ))) {
        return { ok: false, reason: `every array value of "${path}" must match one of the specified types` };
    }
    if (type.typeOf === 'object' && type.children) {
        return checkObject(path, type.children, value as Object, partial);
    }
    return { ok: true };
}

export class TypeChecker {
    type: IType
    constructor(definition: string|Object) {
        if (typeof definition === 'object') {
            // Turn object into typescript definitions
            // eg:
            // const example = {
            //     "name": "string",
            //     "born": "Date",
            //     "instrument": "'guitar'|'piano'",
            //     "address?": {
            //         "street": "string"
            //     }
            // };
            // Resulting ts: "{name:string,born:Date,instrument:'guitar'|'piano',address?:{street:string}"
            const toTS = obj => {
                return '{' + Object.keys(obj)
                .map(key => {
                    let val = obj[key];
                    if (typeof val === 'object') { val = toTS(val); }
                    else if (typeof val !== 'string') { throw new Error(`Type definition for ${key} must be a string or object`); }
                    return `${key}:${val}`;
                })
                .join(',') + '}'
            }
            this.type = parse(toTS(definition));
        }
        else if (typeof definition === 'string') {
            this.type = parse(definition);
        }
        else {
            throw new Error(`Type definiton must be a string or an object`);
        }
    }
    check(path: string, value: any, partial: boolean) {
        return checkType(path, this.type, value, partial);
    }
}

//tsc ts/typecheck.ts --target es6 --lib es2017 --module commonjs --outDir .