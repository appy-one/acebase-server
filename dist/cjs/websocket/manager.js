"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const acebase_core_1 = require("acebase-core");
class WebSocketManager extends acebase_core_1.SimpleEventEmitter {
    constructor(framework) {
        super();
        this.framework = framework;
    }
    on(event, callback) {
        super.on(event, callback);
    }
    emit(event, data) { super.emit(event, data); return this; }
}
exports.WebSocketManager = WebSocketManager;
//# sourceMappingURL=manager.js.map