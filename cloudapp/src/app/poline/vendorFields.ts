import * as url from "url";

export class VendorFields {
    private _code:string;
    private _name:string;
    private _link:url;

    constructor(code: string, name: string, link: (url: string) => string) {
        this._code=code;
        this._name=name;
        this._link=link;
    }

    public getCode(): string {
        return this._code;
    }

    public getName(): string {
        return this._name;
    }

    public getLink(): url {
        return this._link;
    }

    public consoleLogFields():void{
        console.log('this._code(): ', this._code);
        console.log('this._name(): ', this._name);
        console.log('this._link(): ', this._link);
    }
}
