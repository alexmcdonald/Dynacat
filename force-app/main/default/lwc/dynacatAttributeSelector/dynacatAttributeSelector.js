/*
 * dynacatAttributeSelector LWC is used to easily select the attributes that
 * apply to each record.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, wire, api, track } from 'lwc';
import getActiveAttributes from '@salesforce/apex/DynacatAttSelectorController.getActiveAttributes';
import saveRecordAttributes from '@salesforce/apex/DynacatAttSelectorController.saveRecordAttributes';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const columns = [
    {
        type: 'text',
        fieldName: 'label',
        label: 'Name',
    },
];

export default class DynacatAttributeSelector extends LightningElement {

    // Inputs
    @api lookupFieldName;
    @api expandedLevels;

    // Implicit Inputs
    @api recordId;
    @api objectApiName;

    // Tree-Grid Attributes
    @track gridColumns = columns;
    @track gridData = [];
    @track expandedRows = [];
    @track selectedRows = [];

    // Displays the component only after the data is ready
    dataRetrieved = false;

    levels;
    selectedRowStore = [];
    bypassRowStore = false;

    // Retrieves all the active attributes
    @wire(getActiveAttributes, {
        recordId: '$recordId',
        objectApiName: '$objectApiName',
        lookupFieldName: '$lookupFieldName'
    })
    attributes({ error, data }) {
        if (data) {
            let parsedData = JSON.parse(data);
            this.gridData = parsedData.attributeList;
            if (parsedData.hasOwnProperty('savedAttributes') && parsedData.savedAttributes.length > 0) {
                this.selectedRows = parsedData.savedAttributes;
                parsedData.savedAttributes.forEach((sa) => {
                    this.selectedRowStore.push({ name: sa });
                });
            }
            this.levels = parsedData.levels;
            if (this.expandedLevels != null) {
                let _expandedLevels = this.expandedLevels.split(",");
                _expandedLevels.forEach(level => {
                    this.expandedRows = this.expandedRows.concat(this.expandedRows, this.levels[level]);
                });
            }
            this.dataRetrieved = true;
        } else if (error) {
            console.log(error);
        }
    };

    get dataReady() {
        return (this.dataRetrieved) ? true : false;
    }

    handleSave(event) {
        let _selectedRows = [];
        this.selectedRowStore.forEach((row) => {
            _selectedRows.push(row.name);
        });
        saveRecordAttributes({
            newAttributes: JSON.stringify(_selectedRows),
            recordId: this.recordId,
            objectApiName: this.objectApiName,
            lookupFieldName: this.lookupFieldName
        }).then((result) => {
            console.log(result);
            this.showToast();
        }).catch((error) => {
            console.log(error);
        });
    }

    handleSelect(event) {
        if (!this.bypassRowStore) {
            console.log('Row selected.');
            console.log(event.detail.selectedRows);
            this.selectedRowStore = event.detail.selectedRows;
        }
    }

    // Maintains the selected rows as the section is expanded/collapsed
    handleToggle(event) {
        if (event.detail.isExpanded) {
            let _selectedRows = [];
            this.selectedRowStore.forEach((row) => {
                _selectedRows.push(row.name);
            });
            this.selectedRows = _selectedRows;
            this.bypassRowStore = false;
        } else {
            this.bypassRowStore = true;
        }
    }

    handleToggleAll(event) {
        console.log('All toggled');
    }

    showToast() {
        const event = new ShowToastEvent({
            title: 'Attributes Saved',
            message:
                'Refresh the page to reload related lists.',
        });
        this.dispatchEvent(event);
    }

}