/*
 * dynacatCatalog LWC is the original client-based catalog renderer. With this version, ALL records for the 
 * target object will be downloaded to the browser, and filtering and pagination is all handled by the LWC. 
 * It's really fast because of this, but will run into scalability challenges with larger record sets.
 *
 * Only a very simple layout for the records is included in this sample, the intention is that you would extend the
 * LWC and the controller to retrieve relevant fields from the target object and lay them out as you like. For a
 * more configurable option, start with the dynacatTileWall LWC instead.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, wire, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getActiveRecords from '@salesforce/apex/DynacatCatalogController.getActiveRecords';

// Import message service features required for subscribing and the message channel
import { subscribe, MessageContext } from 'lightning/messageService';
import FILTER_CHANGED_CHANNEL from '@salesforce/messageChannel/dynacatFilterChanged__c';

export default class DynacatCatalog extends NavigationMixin(LightningElement) {

    // Inputs
    @api recordTypeNames = '';
    @api uniqueFieldName;
    @api isActiveFieldName = '';
    @api deployment;
    @api limitResults = -1;
    @api orderBy = '';
    @api numberColumns;

    progressText;
    showNext;
    showPrevious;


    offset = 0;

    @track filteredRecords;
    @track displayRecords;
    @track records;
    @track recAttr;
    objectApiName;

    @track filters = {};

    dataRetrieved = false;

    @wire(getActiveRecords, {
        recordTypeNames: '$recordTypeNames',
        isActiveFieldName: '$isActiveFieldName',
        deployment: '$deployment',
        orderBy: '$orderBy'
    })
    attributes({ error, data }) {
        if (data) {
            let parsedData = JSON.parse(data);
            this.records = parsedData.records;
            this.objectApiName = parsedData.objectApiName;
            this.filteredRecords = this.records;
            this.displayRecords = (this.limitResults) ? this.filteredRecords.slice(0,parseInt(this.limitResults)) : this.filteredRecords;
            this.recAttr = parsedData.recAttr;
            this.updateProgress();
            //console.log(JSON.stringify(this.recAttr));
            //console.log(JSON.stringify(this.records));
            this.dataRetrieved = true;
        } else if (error) {
            console.log(error);
        }
    };

    get dataReady() {
        return (this.dataRetrieved) ? true : false;
    }

    @wire(MessageContext)
    messageContext;

    // Encapsulate logic for LMS subscribe.
    subscribeToMessageChannel() {
        this.subscription = subscribe(
            this.messageContext,
            FILTER_CHANGED_CHANNEL,
            (message) => this.handleMessage(message)
        );
    }

    // Handler for message received by component
    handleMessage(message) {
        let node = message.appliedFilters;
        this.filters[node.rootNode] = node.filters;

        let _filteredRecords = this.records;
        //console.log('Filters: ' + JSON.stringify(this.filters));
        for (var tree in this.filters) {
            console.log('Current Tree: ' + JSON.stringify(tree));

            if (this.filters[tree].filterType == 'range') {
                const field = tree;
                console.log('Filter is a range: ' + field);
                const values = this.filters[tree].range;
                console.log('Filter values: ' + values);

                if (typeof values['start'] != "undefined" && values['start'] != null)
                    _filteredRecords = _filteredRecords.filter(rec =>
                        (typeof rec.record[field] != "undefined")
                            ? rec.record[field] >= values['start']
                            : false);
                if (typeof values['finish'] != "undefined" && values['finish'] != null)
                    _filteredRecords = _filteredRecords.filter(rec =>
                        (typeof rec.record[field] != "undefined")
                            ? rec.record[field] <= values['finish']
                            : false);

            } else if(this.filters[tree].filterType == 'date-range') {
                const field = tree;
                console.log('Filter is a date: ' + field);
                const values = this.filters[tree].dateRange;
                console.log('Filter values: ' + JSON.stringify(values));

                if(typeof values['start'] != "undefined" && values['start'] != null)
                    _filteredRecords = _filteredRecords.filter(rec =>
                        (typeof rec.record[field] != "undefined")
                            ? rec.record[field] >= values['start']
                            : false);
                if(typeof values['finish'] != "undefined" && values['finish'] != null)
                _filteredRecords = _filteredRecords.filter(rec =>
                    (typeof rec.record[field] != "undefined")
                        ? rec.record[field] <= values['finish']
                        : false);

            } else if (this.filters.hasOwnProperty(tree) && this.filters[tree].values.length > 0) {
                if (this.filters[tree].type == 'PICKLIST' || this.filters[tree].type == 'MULTIPICKLIST') {
                    let field = tree;
                    console.log('Filter is a field: ' + field);
                    const values = this.filters[tree].values;
                    console.log('Filter values: ' + values);
                    _filteredRecords = _filteredRecords.filter(rec => {
                        if (field.indexOf('.') != -1) {
                            let notFound = false;
                            let parentRec = Object.assign({}, rec);
                            let fieldArray = field.split('.');
                            for (let i = 0; i < fieldArray.length - 1; i++) {
                                if (typeof parentRec.record[fieldArray[i]] != "undefined") {
                                    parentRec.record = parentRec.record[fieldArray[i]];
                                } else {
                                    notFound = true;
                                    break;
                                }
                            }
                            if (!notFound) {
                                return values.some(r => parentRec.record[fieldArray[fieldArray.length - 1]].split(';').includes(r));
                            } else {
                                return false;
                            }
                        } else if (typeof rec.record[field] != "undefined") {
                            return values.some(r => rec.record[field].split(';').includes(r));
                        } else {
                            return false;
                        }
                    });
                } else if (this.filters[tree].type == 'BOOLEAN') {
                    const field = tree;
                    console.log('Filter is a boolean field: ' + field);
                    const values = this.filters[tree].values;
                    //const boolValue = (value == 'true') ? true : false;
                    console.log('Filter values: ' + values);
                    _filteredRecords = _filteredRecords.filter(rec => {
                        if(field.indexOf('.') != -1) {
                            let notFound = false;
                            let parentRec = Object.assign({}, rec);
                            let fieldArray = field.split('.');
                            for(let i=0; i < fieldArray.length-1; i++) {
                                if(typeof parentRec.record[fieldArray[i]] != "undefined") {
                                    parentRec.record = parentRec.record[fieldArray[i]];
                                } else {
                                    notFound = true;
                                    break;
                                }
                            }
                            if(!notFound) {
                                return values.some(r => (parentRec.record[fieldArray[fieldArray.length-1]] == (r == 'true') ? true : false));
                            } else {
                                return false;
                            }
                        } else if (typeof rec.record[field] != "undefined") {
                            return values.some(r => (rec.record[field] == (r == 'true') ? true : false));
                        } else {
                            return false;
                        }
                    });
                } else if(this.filters[tree].type == 'attribute') {
                    console.log('Filter is an attribute.');
                    let _matchingRecordIds = [];
                    this.filters[tree].values.forEach((f) => {
                        if (this.recAttr.hasOwnProperty(f)) {
                            console.log('Matched Filter: ' + f);
                            _matchingRecordIds = _matchingRecordIds.concat(this.recAttr[f]);
                        }
                    });
                    _matchingRecordIds = [...new Set(_matchingRecordIds)];
                    _filteredRecords = _filteredRecords.filter(rec => _matchingRecordIds.includes(rec["id"]));
                }
            } else {
                // do nothing, leave _filteredRecords as is
            }
        }
        this.filteredRecords = _filteredRecords;
        this.displayRecords = (this.limitResults) ? this.filteredRecords.slice(0,parseInt(this.limitResults)) : this.filteredRecords;
        this.offset = 0;
        this.updateProgress();
    }

    handleNext() {
        this.getMoreRecords(true);
    }

    handlePrevious() {
        this.getMoreRecords(false);
    }

    getMoreRecords(more) {
        let offset = (more) ? (this.offset + this.limitResults) : (this.offset - this.limitResults);
        this.displayRecords = this.filteredRecords.slice(offset, offset+this.limitResults);
        this.offset += (more) ? this.limitResults : -this.limitResults;
        this.updateProgress();
    }

    updateProgress() {
        if(this.filteredRecords.length == 0) {
            this.progressText = 'No records matched the filters.';
        } else {
            this.progressText = 'Showing records '+(this.offset+1)+' to '+(this.offset+this.displayRecords.length)+' of '+this.filteredRecords.length+' total.';
        }
        this.showNext = (this.filteredRecords.length > (this.offset + this.displayRecords.length));
        this.showPrevious = (this.offset > 0);
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

    get columnClass() {
        const colSize = 12/parseInt(this.numberColumns);
        return `slds-col slds-size_${colSize}-of-12 slds-p-vertical_small`;
    };

    // Standard lifecycle hooks used to sub/unsub to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }


}