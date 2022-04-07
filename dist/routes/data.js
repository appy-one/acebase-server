"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const context_1 = require("../middleware/context");
const data_get_1 = require("./data-get");
const data_update_1 = require("./data-update");
const data_set_1 = require("./data-set");
const data_transaction_1 = require("./data-transaction");
const data_exists_1 = require("./data-exists");
const data_reflect_1 = require("./data-reflect");
const data_import_1 = require("./data-import");
const data_export_1 = require("./data-export");
const data_query_1 = require("./data-query");
// Indexes:
const data_indexes_list_1 = require("./data-indexes-list");
const data_index_1 = require("./data-index");
// Schemas:
const data_schemas_list_1 = require("./data-schemas-list");
const data_schema_get_1 = require("./data-schema-get");
const data_schema_set_1 = require("./data-schema-set");
// Sycnronization:
const data_sync_mutations_1 = require("./data-sync-mutations");
const data_sync_changes_1 = require("./data-sync-changes");
const addRoutes = (env) => {
    // Add context middleware that handles AceBase-Context header
    context_1.default(env);
    // Add get data endpoint
    data_get_1.default(env);
    // Add update data endpoint
    data_update_1.default(env);
    // Add set data endpoint
    data_set_1.default(env);
    // add transaction routes (start & finish)
    data_transaction_1.default(env);
    // Add exists endpoint
    data_exists_1.default(env);
    // Add reflect endpoint
    data_reflect_1.default(env);
    // Add import endpoint
    data_import_1.default(env);
    // Add export endpoint
    data_export_1.default(env);
    // Add query endpoint
    data_query_1.default(env);
    // Add get indexes endpoint
    data_indexes_list_1.default(env);
    // Add create index endpoint
    data_index_1.default(env);
    // Add list schemas endpoint
    data_schemas_list_1.default(env);
    // Add get schema endpoint
    data_schema_get_1.default(env);
    // add set schema endpoint
    data_schema_set_1.default(env);
    // Add sync mutations endpoint
    data_sync_mutations_1.default(env);
    // add sync changes endpoint
    data_sync_changes_1.default(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=data.js.map