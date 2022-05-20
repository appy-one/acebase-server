import { AceBaseEmailRequest } from '../shared/email';
export interface AceBaseServerEmailServerSettings {
    host: string;
    port: number;
    username?: string;
    password?: string;
    secure: boolean;
}
export interface AceBaseServerEmailSettings {
    /** NOT IMPLEMENTED YET - Use send property for your own implementation */
    server?: AceBaseServerEmailServerSettings;
    /** function to call when an e-mail needs to be sent */
    send: (request: AceBaseEmailRequest) => Promise<void>;
}
