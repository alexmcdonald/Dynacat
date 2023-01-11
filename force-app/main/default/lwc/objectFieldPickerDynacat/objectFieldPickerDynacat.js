/*
 * objectFieldPicker LWC is a Flow screen component that enables you to select an SObject and Field, 
 * including navigation of lookup / master-detail fields.  It outputs the field path (eg. Account.Owner.Name) 
 * and the object the final field is on (in that example the User object). If the field is a picklist field 
 * then the valid values are also output.
 *
 * Dynacat version used in the Dynacat Configurator Flow.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

import getObjects from '@salesforce/apex/ObjectFieldPickerController_Dynacat.getObjects';
import getFields from '@salesforce/apex/ObjectFieldPickerController_Dynacat.getFields';

export default class ObjectFieldPickerDynacat extends LightningElement {

    // Inputs
    @api fieldTypes;
    @api hideObject = false;

    // Ins & Outs
    @api selectedSObject;
    @api selectedField;

    // Outputs
    @api fieldType;
    @api picklistValues;

    // Shadow Ins/Outs
    _selectedSObject;
    _selectedField;

    sObjects;
    fields;
    fieldMap;

    rFields = [];

    _dataReady = false;
    get dataReady() {
        return this._dataReady;
    }

    getAllSObjects() {
        getObjects().then((result) => {
            if (result) {
                const parsedData = JSON.parse(result);
                this.sObjects = parsedData;
                if (this.selectedSObject) {
                    this._selectedSObject = this.selectedSObject;
                    this.getFields(this._selectedSObject);
                }
                this._dataReady = true;
            }
        }).catch((error) => {
            console.log(error.message);
        })
    }

    getFields(objectApiName) {
        getFields({
            objectApiName: objectApiName,
            fieldTypes: this.fieldTypes
        }).then((result) => {
            if (result) {
                const parsedData = JSON.parse(result);
                this.fields = parsedData.fields;
                this.fieldMap = parsedData.fieldMap;
                if (this.selectedField) {
                    this._selectedField = this.selectedField;
                    this._fieldType = this.fieldMap[this._selectedField].type;
                    this.dispatchEvent(new FlowAttributeChangeEvent('fieldType', this._fieldType));
                }
            }
        }).catch((error) => {
            console.log(error.message);
        })
    }

    handleSObjectChange(event) {
        this.fields = '';
        this._selectedField = '';
        this.rFields = [];

        const objectApiName = event.detail.value;
        this.getFields(objectApiName);
        this._selectedSObject = objectApiName;
        this.dispatchEvent(new FlowAttributeChangeEvent('selectedSObject', objectApiName));
    }

    handleFieldChange(event) {
        this.rFields = [];

        const fieldName = event.detail.value;
        this._selectedField = fieldName;
        const fieldType = this.fieldMap[fieldName].type;
        if (fieldType == 'REFERENCE') {
            this.getRelatedFields(fieldName, this.fieldMap[fieldName].referenceTo, this.fieldMap);
        } else {
            this.dispatchEvent(new FlowAttributeChangeEvent('selectedField', this._selectedField));
            this.dispatchEvent(new FlowAttributeChangeEvent('fieldType', fieldType));
            const picklistValues = (fieldType == 'PICKLIST' || fieldType == 'MULTIPICKLIST') ? this.fieldMap[fieldName].picklistValues : '';
            if (picklistValues.length <= 255)
                this.dispatchEvent(new FlowAttributeChangeEvent('picklistValues', picklistValues));
        }

    }

    handleRFieldChange(event) {
        const index = parseInt(event.currentTarget.dataset.index);
        const fieldMap = this.rFields[index].fieldMap;
        const fieldName = event.detail.value;

        if (index < (this.rFields.length - 1)) this.rFields = this.rFields.slice(0, index + 1);

        const fieldType = fieldMap[fieldName].type;
        if (fieldType == 'REFERENCE') {
            this.getRelatedFields(fieldName, fieldMap[fieldName].referenceTo, fieldMap);
        } else {
            let fieldPath = '';
            this.rFields.forEach((field, index) => {
                fieldPath += field.relationshipName + '.';
            });
            fieldPath += fieldName;
            this.dispatchEvent(new FlowAttributeChangeEvent('selectedField', fieldPath));
            this.dispatchEvent(new FlowAttributeChangeEvent('fieldType', fieldType));
            this.dispatchEvent(new FlowAttributeChangeEvent('selectedSObject', event.currentTarget.dataset.object));
            const picklistValues = (fieldType == 'PICKLIST' || fieldType == 'MULTIPICKLIST') ? fieldMap[fieldName].picklistValues : '';
            if (picklistValues.length <= 255)
                this.dispatchEvent(new FlowAttributeChangeEvent('picklistValues', picklistValues));

        }



    }

    getRelatedFields(fieldName, objectApiName, fieldMap) {

        getFields({
            objectApiName: objectApiName,
            fieldTypes: this.fieldTypes
        }).then((result) => {
            if (result) {
                const parsedData = JSON.parse(result);
                const _fields = parsedData.fields;
                const _fieldMap = parsedData.fieldMap;
                let rFields = {
                    key: this.rFields.length,
                    fields: _fields,
                    fieldMap: _fieldMap,
                    value: '',
                    referenceTo: fieldMap[fieldName].referenceTo,
                    referenceToLabel: fieldMap[fieldName].referenceToLabel,
                    relationshipName: fieldMap[fieldName].relationshipName,
                    labelText: `Select ${fieldMap[fieldName].referenceToLabel} Field`
                }
                this.rFields = this.rFields.concat(rFields);
            }
        }).catch((error) => {
            console.log(error.message);
        });

    }

    connectedCallback() {
        this.getAllSObjects();
    }

}