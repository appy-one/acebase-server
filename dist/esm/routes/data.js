import addContextMiddleware from "../middleware/context.js";
import addGetDataRoute from './data-get.js';
import addUpdateDataRoute from './data-update.js';
import addSetDataRoute from './data-set.js';
import addTransactionRoutes from './data-transaction.js';
import addExistsRoute from './data-exists.js';
import addReflectRoute from './data-reflect.js';
import addImportDataRoute from './data-import.js';
import addExportDataRoute from './data-export.js';
import addQueryRoute from './data-query.js';
// Indexes:
import addListIndexesRoute from './data-index-list.js';
import addCreateIndexRoute from './data-index-create.js';
import addDeleteIndexRoute from './data-index-delete.js';
// Schemas:
import addListSchemasRoute from './data-schemas-list.js';
import addGetSchemaRoute from './data-schema-get.js';
import addSetSchemaRoute from './data-schema-set.js';
// Sycnronization:
import addSyncMutationsRoute from './data-sync-mutations.js';
import addSyncChangesRoute from './data-sync-changes.js';
export const addRoutes = (env) => {
    // Add context middleware that handles AceBase-Context header
    addContextMiddleware(env);
    // Add get data endpoint
    addGetDataRoute(env);
    // Add update data endpoint
    addUpdateDataRoute(env);
    // Add set data endpoint
    addSetDataRoute(env);
    // add transaction routes (start & finish)
    addTransactionRoutes(env);
    // Add exists endpoint
    addExistsRoute(env);
    // Add reflect endpoint
    addReflectRoute(env);
    // Add import endpoint
    addImportDataRoute(env);
    // Add export endpoint
    addExportDataRoute(env);
    // Add query endpoint
    addQueryRoute(env);
    // Add index endpoints:
    addListIndexesRoute(env); // list indexes
    addCreateIndexRoute(env); // create index
    addDeleteIndexRoute(env); // delete index
    // Add list schemas endpoint
    addListSchemasRoute(env);
    // Add get schema endpoint
    addGetSchemaRoute(env);
    // add set schema endpoint
    addSetSchemaRoute(env);
    // Add sync mutations endpoint
    addSyncMutationsRoute(env);
    // add sync changes endpoint
    addSyncChangesRoute(env);
};
export default addRoutes;
//# sourceMappingURL=data.js.map