import { RouteInitEnvironment } from "./shared/env";
import addContextMiddleware from "./middleware/context";
import addGetDataRoute from './data-get';
import addUpdateDataRoute from './data-update';
import addSetDataRoute from './data-set';
import addTransactionRoutes from './data-transaction';
import addExistsRoute from './data-exists';
import addReflectRoute from './data-reflect';
import addImportDataRoute from './data-import';
import addExportDataRoute from './data-export';
import addQueryRoute from './data-query';

// Indexes:
import addListIndexesRoute from './data-indexes-list';
import addCreateIndexRoute from './data-index';

// Schemas:
import addListSchemasRoute from './data-schemas-list';
import addGetSchemaRoute from './data-schema-get';
import addSetSchemaRoute from './data-schema-set';

// Sycnronization:
import addSyncMutationsRoute from './data-sync-mutations';
import addSyncChangesRoute from './data-sync-changes';

export const addRoutes = (env: RouteInitEnvironment) => {

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

    // Add get indexes endpoint
    addListIndexesRoute(env);

    // Add create index endpoint
    addCreateIndexRoute(env);

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