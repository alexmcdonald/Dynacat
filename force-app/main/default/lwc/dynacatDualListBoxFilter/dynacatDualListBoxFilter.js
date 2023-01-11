/*
 * dynacatDualListBoxFilter LWC renders a two-column select box that can be used with PICKLIST and MULTIPICKLIST
 * fields, or one level of Attributes.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api, track } from 'lwc';

export default class DynacatDualListBoxFilter extends LightningElement {

    @api xid;
    @api label;
    @track values;
    @api children;
    @api level;
    @api type;
    arialevel;

    options = [];

    handleSelect(event) {

        this.values = event.detail.value;

        const multiSelectClick = this.dispatchEvent(new CustomEvent('multiselect', {
            detail: {
                root: this.xid, xids: this.values, type: this.type
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