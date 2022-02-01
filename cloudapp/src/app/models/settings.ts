export class Settings {
    vendorSearchLimit: number = 10;
    vendorCodeFilter:string = "";
    polineVendorNameFilter: string = "";//Import af Bogfortegnelsen fra DBC
    searchUsingBib260B: boolean = false;

    checks: Array<string> = ['', '',''];


    // polineStatusFilter: { cancelled:boolean, deleted:boolean, closed:boolean };
}
