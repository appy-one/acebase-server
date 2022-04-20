import * as swaggerJsdoc from 'swagger-jsdoc';
const createSwaggerDocs = swaggerJsdoc.default ?? swaggerJsdoc; // ESM and CJS compatible approach
import * as _swaggerUi from 'swagger-ui-express';
const swaggerUi = _swaggerUi.default ?? _swaggerUi; // ESM and CJS compatible approach
import { packageRootPath } from '../shared/rootpath.js';
import { join as joinPaths } from 'path';
const yamlPath = joinPaths(packageRootPath, '/src/routes/*.yaml');
// console.log(`Using path ${yamlPath} for Swagger documentation`);
export const addRoute = (env) => {
    // Generate docs from all yaml files
    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'AceBase Server',
                description: 'AceBase Server API endpoint documentation and test environment. This documentation is available on the server because it is running in development mode. To disable this, set your NODE_ENV environment variable to production. Many endpoints require you to authenticate using Bearer authentication. Use the _/auth/{dbname}/signin_ endpoint to obtain an access token, then click the _Authorize_ button and paste your token into the input field. For more information about AceBase, see GitHub',
                version: '1.10.0',
                contact: {
                    name: 'AceBase API Support',
                    email: 'me@appy.one',
                    url: 'https://github.com/appy-one/acebase-server'
                },
                // servers: [`http://${config.server.host}:${config.server.port}`]
            },
            tags: [{
                    name: 'auth',
                    description: 'User authentication endpoints'
                }, {
                    name: 'oauth2',
                    description: 'User authentication using 3rd party OAuth2 providers'
                }, {
                    name: 'data',
                    description: 'Data manipulation and query endpoints'
                }, {
                    name: 'indexes',
                    description: 'Index management endpoints'
                }, {
                    name: 'schemas',
                    description: 'Data schema management endpoints'
                }, {
                    name: 'metadata',
                    description: 'Metadata endpoints'
                }],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'token' // switch to JWT in the future?
                    }
                },
                schemas: {
                    User: {
                        type: 'object',
                        properties: {
                            uid: { type: 'string', example: 'jpx0k53u0002ecr7s354c51l' },
                            username: { type: 'string', example: 'someuser' },
                            email: { type: 'string', example: 'email@domain.com' },
                            displayName: { type: 'string', example: 'Some User' },
                            picture: {
                                type: 'object',
                                properties: {
                                    width: { type: 'number', example: 500 },
                                    height: { type: 'number', example: 500 },
                                    url: { type: 'string', example: 'https://profile.pic/user.jpg' }
                                }
                            },
                            emailVerified: { type: 'boolean', example: true },
                            created: { type: 'string', example: '2022-03-09T15:38:57.361Z' },
                            prevSignin: { type: 'string', example: '2022-03-09T15:38:57.361Z' },
                            prevSigninIp: { type: 'string', example: '127.0.0.1' },
                            lastSignin: { type: 'string', example: '2022-03-09T15:38:57.361Z' },
                            lastSigninIp: { type: 'string', example: '127.0.0.1' },
                            changePassword: { type: 'boolean', example: false },
                            changePasswordRequested: { type: 'boolean', example: false },
                            changePasswordBefore: { type: 'string', example: '2022-03-09T15:38:57.361Z' },
                            settings: { type: 'object' }
                        }
                    },
                    Error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', description: 'error code', example: 'invalid_request' },
                            message: { type: 'string', description: 'The error message', example: 'Invalid request for this endpoint' }
                        }
                    },
                    UnexpectedError: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', value: 'unexpected', description: 'The string `"unexpected"`' },
                            message: { type: 'string', description: 'The server error message' }
                        }
                    },
                    UnknownError: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', value: 'unknown', description: 'The string `"unknown"`' },
                            message: { type: 'string', description: 'The server error message' }
                        }
                    },
                    SchemaValidationError: {
                        type: 'object',
                        properties: {
                            code: { type: 'string', description: 'The string `"schema_validation_failed"`', example: 'schema_validation_failed' },
                            message: { type: 'string', description: 'The server error message', example: 'Property at path "path/property" is of the wrong type' }
                        }
                    },
                    SerializedValue: {
                        type: 'object',
                        properties: {
                            val: {
                                description: 'Any value (serialized for transport)',
                                oneOf: [
                                    { type: 'string' },
                                    { type: 'number' },
                                    { type: 'integer' },
                                    { type: 'boolean' },
                                    { type: 'object' },
                                    { type: 'array' }
                                ],
                                example: '2022-04-07T16:36:21Z',
                                required: true
                            },
                            map: {
                                description: 'If the value has been serialized for transport, contains a string defining `val`s data type (eg `"date"` or `"binary"`), or an object with deep property mappings for an object value in `val`',
                                oneOf: [
                                    { type: 'string', example: 'date' },
                                    { type: 'object', example: { 'stats/created': 'date' } }
                                ],
                                example: 'date',
                                required: false
                            }
                        },
                        required: ['val'],
                        example: {
                            val: { name: 'My todo list', stats: { size: 216, created: '2022-04-07T15:11:42Z', modified: '2022-03-08T12:24:05Z' } },
                            map: { 'stats/created': 'date', 'stats/modified': 'date' }
                        }
                    },
                    ReflectionNodeInfo: {
                        type: 'object',
                        required: ['key', 'exists', 'type'],
                        properties: {
                            key: {
                                description: 'Key or index of the node',
                                oneOf: [{
                                        type: 'string',
                                        description: 'key of the node',
                                        example: 'jld2cjxh0000qzrmn831i7rn'
                                    }, {
                                        type: 'number',
                                        description: 'index of the node (parent node is an array)',
                                        example: 12
                                    }]
                            },
                            exists: {
                                type: 'boolean',
                                description: 'whether the target path exists',
                                example: true
                            },
                            type: {
                                type: 'string',
                                enum: ['unknown', 'object', 'array', 'number', 'boolean', 'string', 'date', 'binary', 'reference'],
                                description: 'data type of the target path',
                                example: 'object'
                            },
                            value: {
                                oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array' }, { type: 'object' }],
                                description: `target node's stored value if it is a boolean, number or date, a small string or binary value (less than configured max inline value size), or an empty object or array`,
                                example: {}
                            },
                            address: {
                                type: 'object',
                                description: 'The physical location of the node in the database',
                                required: ['pageNr', 'recordNr'],
                                properties: {
                                    pageNr: { type: 'integer' },
                                    recordNr: { type: 'integer' }
                                }
                            },
                            children: {
                                type: 'object',
                                description: `Information about the node's children (if requested)`,
                                required: ['more', 'list'],
                                properties: {
                                    count: {
                                        type: 'integer',
                                        description: 'The total number of children',
                                        example: 2865
                                    },
                                    more: {
                                        type: 'boolean',
                                        description: 'If there are more children than the ones in list',
                                        example: true
                                    },
                                    list: {
                                        type: 'array',
                                        description: 'Reflection info about the requested children',
                                        items: {
                                            $ref: '#/components/schemas/ReflectionNodeInfo'
                                        },
                                        example: [{
                                                key: 'name',
                                                type: 'string',
                                                value: 'My name'
                                            }]
                                    }
                                }
                            }
                        },
                        example: {
                            key: 'jld2cjxh0000qzrmn831i7rn',
                            exists: true,
                            type: 'object',
                            address: { pageNr: 0, recordNr: 234 },
                            children: {
                                count: 2865,
                                more: true,
                                list: [{
                                        key: 'l260qein000009jy3yjig8h9',
                                        type: 'object',
                                        address: { pageNr: 1, recordNr: 25 }
                                    }, {
                                        key: 'l260rp5b000109jy98ykf7x2',
                                        type: 'object',
                                        address: { pageNr: 1, recordNr: 54 }
                                    }]
                            }
                        }
                    }
                }
            },
            security: [
                // Enable bearer auth globally
                { bearerAuth: [] }
            ],
        },
        apis: [yamlPath]
    };
    const swaggerDocs = createSwaggerDocs(options);
    env.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};
export default addRoute;
//# sourceMappingURL=docs.js.map