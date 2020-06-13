# AceBase realtime database server

This repository is to setup an http endpoint for a local AceBase database instance. See [AceBase](https://www.npmjs.com/package/acebase) for more information about AceBase databases and usage.

## Getting started

Install the *acebase-server* npm package: ```npm install acebase-server``` ([github](https://github.com/appy-one/acebase-server), [npm](https://www.npmjs.com/package/acebase-server))

## Creating an AceBase server

To launch an AceBase webserver using default settings
- requires users to sign in (denies anonymous access)
- runs without SSL (http)

```javascript
const { AceBaseServer } = require('acebase-server');
const dbname = 'mydb';
const server = new AceBaseServer(dbname, { host: 'localhost', port: 5757 });
server.on("ready", () => {
    console.log("SERVER ready");
});
```

**NOTE**: The above code will create an admin user with a generated password, which will be displayed once in the console output. Only MD5 hashes of user passwords are stored in the auth database, so it'll become fairly hard to sign into the admin account if you don't copy/paste the password somewhere. If you don't want to use a generated password, see _Enable authentication_ below for info about how to supply a default password

### Enable SSL (https)

To run the server on a secure https connection, you can simply provide details about the location of your certificate files:

```javascript
const settings = {
    host: 'mydb.example.com',
    port: 443,
    https: {
        certPath: './mycertificate.pem',
        keyPath: './myprivatekey.pem'
    }
};
const server = new AceBaseServer(dbname, settings);
```

You can either pass ```certPath``` and ```keyPath```, or ```pfxPath``` and ```passphrase``` - depending on the type of certificate files you have.

### Enable authentication

Authentication settings determine who is allowed access to your server. By enabling authentication, the server will allow users to sign in (and signup) and authorization rules to be defined for data being read/written to the database.

```javascript
const settings = {
    host: 'mydb.example.com',
    port: 80,
    authentication: {
        enabled: true,
        allowUserSignup: false,
        defaultAccessRule: 'auth',
        defaultAdminPassword: '75sdDSFg37w5'
    }
}
```

The following ```authentication``` settings are available:
- ```enabled```: whether to enable user authentication (default: ```true```)
- ```allowUserSignup```: whether users can sign up for an account themselves, or if the admin has to (default: ```false```)
- ```defaultAccessRule```: default authorization rule for read/write operations. Either ```deny```, ```allow``` or ```auth```. The first time the server is launched with authentication enabled, it will create a ```rules.json``` file that contains this access rule for any path. ```deny``` will deny all users (except admin) read/write access, ```allow``` will grant access to anyone, ```auth``` will grant access only to authenticated users (default: ```auth```)
- ```defaultAdminPassword```: supply a default password for the admin account that will be used when it is created. If you do not supply this, a generated password will be used instead and displayed only once in the console output.

### Setup authorization rules

If you enabled authentication, you can also define access rules for your data. Using rules, you can allow or deny specific (or anonymous) users read and/or write access to your data. These rules are identical to those used by [Firebase](https://firebase.google.com/docs/database/security/) (Note: ".read" and ".write" only, ".validate" might be implemented in the future, ".schema" implemented as alternative) and are saved in a file called _rules.json_ in your database directory. The default rules written to the file are determined by the ```defaultAccessRule``` authentication setting at the first server launch with ```authentication``` enabled.

The default _rules.json_ file content is based on the value of the ```defaultAccessRule``` setting, possible values are:
 * ```"auth"```: Only allow authenticated users read/write access to the database
 * ```"allow"```: Allow anyone (including anonymous users) read/write access to the database
 * ```"deny"```: Deny anyone (except admin user) read/write access to the database

When ```defaultAccessRule: "auth"``` is used, it will generate the following _rules.json_ file:
```json
{
    "rules": {
        ".read": "auth !== null",
        ".write": "auth !== null"
    }
}
```

When ```"allow"``` or ```"deny"``` is used, the ```".read"``` and ```".write"``` properties will be set to ```true``` or ```false``` respectively.

If you want to further restrict what data users can access and/or write to (RECOMMENDED!), you could edit the file as such, granting users read/write access to their own user node:
```json
{
    "rules": {
        "users": {
            "$uid": {
                ".read": "auth.uid === $uid",
                ".write": "auth.uid === $uid"
            }
        }
    }
}
```

NOTE: Just like Firebase, access is denied by default when nu rule is found for the target path. If an access rule is found, it will be used for any child path. Eg: access for child/descending paths can not be overridden.

### Schema validation

AceBase server now supports TypeScript based schema definitions and validation. Once you've defined a schema for a path, all data being written must adhere to the set schema. Data to be stored/updated will be validated against the schema and denied or allowed accordingly.

To ensure all users have a ```name``` (string), ```email``` (string) and ```language``` (either Dutch, English, German, French or Spanish), optionally a ```birthdate``` (Date) and ```address``` (custom object definition), add the following to your _rules.json_ file:
```json
{
    "rules": {
        "users": {
            "$uid": {
                ".read": "auth.uid === $uid",
                ".write": "auth.uid === $uid",
                ".schema": {
                    "name": "string",
                    "email": "string",
                    "language": "'nl'|'en'|'de'|'fr'|'es'",
                    "birthdate?": "Date",
                    "address?": {
                        "street": "string",
                        "city": "string",
                        "country": "string",
                        "geo?": {
                            "lat": "number",
                            "lon": "number"
                        }
                    }
                }
            }
        }
    }
}
```

You can also decide to split the schema up into multiple levels:
```json
{
    "rules": {
        "users": {
            "$uid": {
                ".read": "auth.uid === $uid",
                ".write": "auth.uid === $uid",

                ".schema": {
                    "name": "string",
                    "email": "string",
                    "language": "'nl'|'en'|'de'|'fr'|'es'",
                    "birthdate?": "Date",
                    "address?": "Object"
                },

                "address": {
                    ".schema": {
                        "street": "string",
                        "city": "string",
                        "country": "string",
                        "geo?": "Object"
                    },

                    "geo": {
                        ".schema": {
                            "lat": "number",
                            "lon": "number"
                        }
                    }
                }
            }
        }
    }
}
```

And, if you prefer, schema definitions can be defined as strings instead:
```json
(...)
    "address": {
        ".schema": "{ street: string, city: string, country: string, geo?: { lat: number, lon: number } }"
    }
(...)
```

## Connecting to a server

See *acebase-client* on [npm](https://www.npmjs.com/package/acebase-client) or [github](https://github.com/appy-one/acebase-client)

## Upgrade notices

v0.9.7: user accounts and server logs are now stored in the target database, instead of in a seperate auth database. If you upgraded from version 0.9.6 or lower and want to keep using the existing auth database, start the server with ```seperateDb: true``` in the options.