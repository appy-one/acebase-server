#!/bin/bash

# Create CommonJS package.json
cat >dist/cjs/package.json <<!JSON
{
    "type": "commonjs"
}
!JSON

# Write typings to support Node16 module resolution 
cat >dist/cjs/index.d.ts <<!TYPESCRIPT
export * from '../types/index.js';
!TYPESCRIPT

# Create ESM package.json
cat >dist/esm/package.json <<!JSON
{
    "type": "module"
}
!JSON

# Write typings to support Node16 module resolution 
cat >dist/esm/index.d.ts <<!TYPESCRIPT
export * from '../types/index.js';
!TYPESCRIPT
