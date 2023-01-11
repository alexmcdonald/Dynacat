/*
 * dynacatRadioFilter LWC renders a standard radio button group that can be used with BOOLEAN, PICKLIST and 
 * MULTIPICKLIST fields, or one level of Attributes.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api, track } from 'lwc';

export default class DynacatRadioFilter extends LightningElement {

    @api xid;
    @api label;
    @track value;
    @api children;
    @api level;
    @api type;
    arialevel;

    options = [];

    handleSelect(event) {

        this.value = event.detail.value;

        const singleSelectClick = this.dispatchEvent(new CustomEvent('singleselect', {
            detail: {
                root: this.xid, xid: this.value, type: this.type
            }
        }));
    }

    handleClear() {
        this.value=undefined;

        const singleSelectClick = this.dispatchEvent(new CustomEvent('singleselect', {
            detail: {
                root: this.xid, xid: null, type: this.type
            }
        }));
    }

    connectedCallback() {
        this.arialevel = this.level + 1;
        this.children.forEach(child => {
            this.options.push(
                {
                    label : child.label,
                    value : child.id
                }
            )
        });
    }
}