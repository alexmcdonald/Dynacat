/*
 * visualPicker LWC is a Flow screen component that renders a collection of records as simple tiles to select from.
 *
 * Dynacat version used in the Dynacat Configurator Flow.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent } from "lightning/flowSupport";

export default class VisualPickerDynacat extends LightningElement {

    @api recordCollection = [];
    @api labelField;
    @api valueField;
    @api summaryField;
    @api iconName;
    @api createNew = false;
    @api createNewText;
    @api value;

    _choices = [];
    get choices() {
        this._choices = [];
        this.recordCollection.forEach(value => {
            this._choices.push({
                label: value[this.labelField],
                value: value[this.valueField],
                summary: value[this.summaryField]
            });
        });
        return this._choices;
    }

    _dataReady = false;
    get dataReady() {
        return this._dataReady;
    }

    _selectedValue;
    handleChange(event) {
        const field = event.target.dataset.id;
        const checked = event.target.checked;
        this._selectedValue = field;
        this.dispatchEvent(new FlowAttributeChangeEvent('value', this._selectedValue));
        this.dispatchEvent(new FlowNavigationNextEvent());
    }

}