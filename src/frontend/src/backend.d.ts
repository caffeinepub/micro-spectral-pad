import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Preset {
    gridData: Uint8Array;
    name: string;
    settings: string;
}
export interface backendInterface {
    deletePreset(name: string): Promise<void>;
    listPresets(): Promise<Array<Preset>>;
    loadPreset(name: string): Promise<Preset>;
    savePreset(name: string, gridData: Uint8Array, settings: string): Promise<void>;
}
