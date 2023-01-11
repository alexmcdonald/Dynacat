/*
 * dynacatDateFilter LWC renders any date range display-style filters.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api, track } from 'lwc';

export default class DynacatDateFilter extends LightningElement {

    @api xid;
    @api label;
    @track startValue;
    @track finishValue;
    @api level;
    @api type;
    arialevel;

    handleChange(event) {

        this.value = event.detail.value;

        const dateChange = this.dispatchEvent(new CustomEvent('datechange', {
            detail: {
                root: this.xid, value: this.value, name: event.currentTarget.dataset.name, type: this.type
            }
        }));
    }

    handleClear() {

        let inputs = this.template.querySelectorAll('[data-input="' + this.xid + '"]');
        inputs.forEach(input => {
            input.value = '';
        });

        const dateClearStart = this.dispatchEvent(new CustomEvent('datechange', {
            detail: {
                root: this.xid, value: null, name: 'start', type: this.type
            }
        }));
        const dateClearFinish = this.dispatchEvent(new CustomEvent('datechange', {
            detail: {
                root: this.xid, value: null, name: 'finish', type: this.type
            }
        }));

    }

    connectedCallback() {
        this.arialevel = this.level + 1;
    }
}