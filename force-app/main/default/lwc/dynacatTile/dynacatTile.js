/*
 * dynacatTile LWC renders one tile in the Tile Wall catalog.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class DynacatTile extends NavigationMixin(LightningElement) {

    @api tile;

    @api get tileClass() {
        return `${this.tile.fields[0].class}`;
    }

    @api get title() {
        return this.tile.fields[0].value;
    }


    handleRecordClick(event) {
        // Stop the event's default behavior.
        // Stop the event from bubbling up in the DOM.
        event.preventDefault();
        event.stopPropagation();


        let recordId = event.currentTarget.attributes.getNamedItem('data-id').value;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: this.objectApiName,
                actionName: 'view'
            }
        });
    }


    _hasRendered = false;
    _hasRendered2 = false;
    _hasRendered3 = false;
    renderedCallback() {

        if (!this._hasRendered2 && this.tile.badges.length > 0) {
            let lastBadge = this.template.querySelector('[data-badge="' + this.tile.badges.length + '"]');
            if (typeof lastBadge != "undefined") {
                this.tile.badges.forEach((badge, index) => {
                    let badgeEl = this.template.querySelector('[data-badge="' + (index + 1) + '"]');
                    badgeEl.style.color = badge.color;
                    badgeEl.style.backgroundColor = badge.bgColor;
                });
                this._hasRendered2 = true;
            }
        }
        if (!this._hasRendered) {
            // Verify whether :host{} variables are inherited from the parent
            let computedStyles = window.getComputedStyle(this.template.host, null);
            let background = computedStyles.getPropertyValue('--background');

            // When accent color was not yet defined, define the variable
            if (!background || background.length == 0) {
                this.template.host.style.setProperty('--background', this.tile.tileBackground);
                this.template.host.style.setProperty('--tileHeight', this.tile.tileHeight);
                this._hasRendered = true;
                this._setHeight = true;
            }

        }

    }
}