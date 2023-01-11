/*
 * Custom Property Editor for the visualPicker LWC Flow screen component.
 *
 * Dynacat version used in the Dynacat Configurator Flow.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api } from 'lwc';

export default class VisualPickerDynacatCpe extends LightningElement {

    @api inputVariables;
    @api genericTypeMappings;
    @api builderContext;

    get recordCollection() {
        const param = this.inputVariables.find(({ name }) => name === 'recordCollection');
        return param && param.value;
    }

    get labelField() {
        const param = this.inputVariables.find(({ name }) => name === 'labelField');
        return param && param.value;
    }

    get valueField() {
        const param = this.inputVariables.find(({ name }) => name === 'valueField');
        return param && param.value;
    }

    get summaryField() {
        const param = this.inputVariables.find(({ name }) => name === 'summaryField');
        return param && param.value;

    }

    get iconName() {
        const param = this.inputVariables.find(({ name }) => name === 'iconName');
        return param && param.value;
    }

    get createNew() {
        const param = this.inputVariables.find(({ name }) => name === 'createNew');
        return param && param.value;
    }

    get createNewText() {
        const param = this.inputVariables.find(({ name }) => name === 'createNewText');
        return param && param.value;
    }

    get inputType() {
        const type = this.genericTypeMappings.find(({ typeName }) => typeName === 'T');
        return type && type.value;
    }


    get valueOptions() {
        const variables = this.builderContext.variables;
        console.log(JSON.stringify(variables));
        return variables.map(({ name }) => ({
            label: name,
            value: name,
        }));
    }

    handleInputTypeChange(event) {
        if (event && event.detail) {
            const newValue = event.detail.value;
            const typeChangedEvent = new CustomEvent(
                'configuration_editor_generic_type_mapping_changed',
                {
                    bubbles: true,
                    cancelable: false,
                    composed: true,
                    detail: {
                        typeName: 'T',
                        typeValue: newValue
                    },
                }
            );
            this.dispatchEvent(typeChangedEvent);
        }
    }

    handleValueChange(event) {
        if (event && event.detail) {
            const newValue = event.detail.value;
            const valueChangedEvent = new CustomEvent(
                'configuration_editor_input_value_changed',
                {
                    bubbles: true,
                    cancelable: false,
                    composed: true,
                    detail: {
                        name: 'recordCollection',
                        newValue,
                        newValueDataType: 'reference',
                    }
                }
            );
            this.dispatchEvent(valueChangedEvent);
        }
    }

    handleChange(event) {
        if (event && event.detail) {
            const newValue = event.detail.value;
            const field = event.currentTarget.dataset.id;
            const fieldChangedEvent = new CustomEvent(
                'configuration_editor_input_value_changed',
                {
                    bubbles: true,
                    cancelable: false,
                    composed: true,
                    detail: {
                        name: field,
                        newValue,
                        newValueDataType: 'String'
                    }
                }
            );
            this.dispatchEvent(fieldChangedEvent);
        }
    }

    handleBooleanChange(event) {
        if(event && event.detail) {
            const newValue = event.target.checked;
            const field = event.currentTarget.dataset.id;
            const fieldChangedEvent = new CustomEvent(
                'configuration_editor_input_value_changed',
                {
                    bubbles: true,
                    cancelable: false,
                    composed: true,
                    detail: {
                        name: field,
                        newValue,
                        newValueDataType: 'Boolean'
                    }
                }
            );
            this.dispatchEvent(fieldChangedEvent);
        }
    }

    connectedCallback() {
        console.log('hello');
        console.log(JSON.stringify(this.inputVariables));

    }

}