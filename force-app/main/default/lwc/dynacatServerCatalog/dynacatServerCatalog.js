/*
 * dynacatServerCatalog LWC is a "server-side" version of the catalog renderer. With this version, all the filtering 
 * and pagination of target records is done in APEX.  It should be much more scalable than the original 
 * dynacatCatalog LWC, particularly if support enable indexing for the fields being filtered, but isn't quite as 
 * snappy as the client-version.  There's also a slight purposeful delay to help ensure messages are received in 
 * the right order.
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
import getDefaultRecords from '@salesforce/apex/DynacatServerCatalogController.getDefaultRecords';
import getFilteredRecords from '@salesforce/apex/DynacatServerCatalogController.getFilteredRecords';
import getNextRecords from '@salesforce/apex/DynacatServerCatalogController.getNextRecords';

// Import message service features required for subscribing and the message channel
import { subscribe, MessageContext } from 'lightning/messageService';
import FILTER_CHANGED_CHANNEL from '@salesforce/messageChannel/dynacatFilterChanged__c';

export default class DynacatServerCatalog extends NavigationMixin(LightningElement) {

    // Inputs
    @api recordTypeNames = '';
    @api isActiveFieldName = '';
    @api deployment;
    @api limitResults = -1;
    @api orderBy = '';
    @api numberColumns;

    progressText;
    showNext;
    showPrevious;

    count = 0;
    offset = 0;

    @track filteredRecords;
    @track records;
    objectApiName;
    soql;
    config;

    @track filters = {};

    dataRetrieved = false;

    _timeout;

    @wire(getDefaultRecords, {
        recordTypeNames: '$recordTypeNames',
        isActiveFieldName: '$isActiveFieldName',
        deployment: '$deployment',
        limitResults: '$limitResults',
        orderBy: '$orderBy'
    })
    attributes({ error, data }) {
        if (data) {
            let parsedData = JSON.parse(data);
            this.count = parsedData.count;
            this.records = parsedData.records;
            this.filteredRecords = this.records;
            this.objectApiName = parsedData.objectApiName;
            this.soql = parsedData.soql;
            this.config = parsedData.config;
            this.updateProgress();
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

        //        console.log(JSON.stringify(this.filters));


        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            getFilteredRecords({
                soqlStr: JSON.stringify(this.soql),
                filtersStr: JSON.stringify(this.filters),
                configStr: JSON.stringify(this.config)
            }).then((result) => {
                if (typeof result != "undefined" && result != null && result != '') {
                    let parsedData = JSON.parse(result);
                    this.count = parsedData.count;
                    this.offset = 0;
                    this.filteredRecords = parsedData.records;
                    this.updateProgress();
                    this.soql = parsedData.soql;
                } else {
                    console.log('getFilteredRecords: No result');
                }
            })
                .catch((error) => {
                    console.log(error.message);
                });

            this.doApiCall()
        }, 300);

    }

    handleNext() {
        this.getMoreRecords(true);
    }

    handlePrevious() {
        this.getMoreRecords(false);
    }

    getMoreRecords(more) {
        let offset = (more) ? (this.offset + this.limitResults) : (this.offset - this.limitResults);
        getNextRecords({
            soqlStr: JSON.stringify(this.soql),
            offset: offset,
            configStr: JSON.stringify(this.config)
        }).then((result) => {
            if (typeof result != "undefined" && result != null && result != '') {
                let parsedData = JSON.parse(result);
                this.count = parsedData.count;
                this.offset += (more) ? this.limitResults : -this.limitResults;
                this.filteredRecords = parsedData.records;
                this.updateProgress();
            } else {
                console.log('getNextRecords: No result');
            }
        }).catch((error) => {
            console.log(error.message);
        })
    }

    updateProgress(queryCount, recordCount) {
        if (this.filteredRecords.length == 0) {
            this.progressText = 'No records matched the filters.';
        } else {
            this.progressText = 'Showing records ' + (this.offset + 1) + ' to ' + (this.offset + this.filteredRecords.length) + ' of ' + this.count + ' total.';
        }
        this.showNext = (this.count > (this.offset + this.filteredRecords.length));
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
        const colSize = 12 / parseInt(this.numberColumns);
        return `slds-col slds-size_${colSize}-of-12 slds-p-vertical_small`;
    };


    // Standard lifecycle hooks used to sub/unsub to message channel
    connectedCallback() {
        this.subscribeToMessageChannel();
    }


}