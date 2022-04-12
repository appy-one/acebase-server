import { SimpleEventEmitter } from "acebase-core";
export class WebSocketManager extends SimpleEventEmitter {
    constructor(framework) {
        super();
        this.framework = framework;
    }
    on(event, callback) {
        super.on(event, callback);
    }
    emit(event, data) { super.emit(event, data); }
}
//# sourceMappingURL=manager.js.map