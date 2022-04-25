export class Settings {
    vendorSearchLimit: number = 10;
    vendorCodeFilter:string = "";
    polineVendorNameFilter: string = "";//Import af Bogfortegnelsen fra DBC
    searchUsingBib260B: boolean = false;

    CANCELLED: boolean = false;
    CLOSED: boolean = false;
    DELETED: boolean = false;
    READY: boolean = false;
}
