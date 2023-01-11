/*
 * dynacatCheckboxFilter LWC renders any checkbox display-style filters, whether they be attributes nested
 * to n-levels, or Boolean / Picklist / Multi-select fields.  This component self-nests, which enables it
 * to go as deep as it needs to.  All of the "smarts" around which checkboxes above or below should be checked
 * or unchecked (eg. checking a box should select all children, and if all the siblings are checked then its parent
 * should also be checked) are handled by the dynacatCatalogFilters component that embeds this.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api } from 'lwc';

export default class DynacatCheckboxFilter extends LightningElement {

    @api xid;
    @api root;
    @api label;
    @api path;
    @api children;
    @api haschildren;
    @api level;
    @api type;

    @api get checked() {
        return this._checked;
    }
    set checked(value) {
        this._checked = value;
        if(this.inputRendered) {
            let input = this.template.querySelector("input[data-id='" + this.xid + "']");
            input.checked = value;
            input.indeterminate = this.indeterminate;
        }
    }

    @api get indeterminate() {
        return this._indeterminate;
    }
    set indeterminate(value) {
        this._indeterminate = value;
        if(this.inputRendered) {
            let input = this.template.querySelector("input[data-id='" + this.xid + "']");
            input.indeterminate = value;
            input.checked = this.checked;
        }
    }
    _indeterminate = false;
    _checked = false;

    arialevel;
    @api selectable;

    @api childLevel;
    @api addChild = false;

    inputRendered = false;

    handleBranchClick(event) {
        let eL = this.template.querySelector("li[data-id='" + this.xid + "']");
        let expand = (eL.getAttribute("aria-expanded") == "true") ? "false" : "true";
        eL.setAttribute("aria-expanded", expand);
    }

    handleCheckboxClick(event) {
        const checkboxClick = this.dispatchEvent(new CustomEvent('checkboxclick', {
            detail: {
                root: this.root, path: this.path, label: this.label, xid: this.xid, checked: event.currentTarget.checked, type: this.type
            }
        }));
    }

    handleChildCheckboxClick(event) {
        const checkboxClick = this.dispatchEvent(new CustomEvent('checkboxclick', { detail: event.detail }));
    }

    connectedCallback() {
        this.arialevel = this.level + 1;
    }

    renderedCallback() {
        let input = this.template.querySelector("input[data-id='" + this.xid + "']");
        if(typeof input != "undefined" && !this.inputRendered) this.inputRendered = true;
    }

}