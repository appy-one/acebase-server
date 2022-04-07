import { Express } from 'express';
import path = require('path');
import * as swaggerJsdoc from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';
// import config from '../config';

export const addRoute = (app: Express) => {
    // Generate docs from all yaml files
    const options:swaggerJsdoc.Options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'AceBase Server API',
                description: 'AceBase Server API',
                version: '1.0.0',
                contact: {
                    name: 'Ewout Stortenbeker',
                    email: 'me@appy.one'
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
                    }
                }
            },
            security: [ 
                // Enable bearer auth globally
                { bearerAuth: [] } 
            ],
        },
        apis: [path.resolve(__dirname, '../ts/routes/*.yaml')]
    };

    const swaggerDocs = swaggerJsdoc(options);
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};

export default addRoute;
