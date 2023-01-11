/*
 * dynacatCatalogFilter LWC renders all the different filter options and sends a message
 * to the catalog components when they change.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, wire, api, track } from 'lwc';
import getAttributes from '@salesforce/apex/DynacatCatalogFiltersController.getActiveAttributes';

// Import message service features required for publishing and the message channel
import { publish, MessageContext } from 'lightning/messageService';
import FILTER_CHANGED_CHANNEL from '@salesforce/messageChannel/dynacatFilterChanged__c';

export default class DynacatCatalogFilters extends LightningElement {

    // Inputs
    @api deployment;
    @api expandedLevels;

    @track attributeList;

    selectedAttributes = {};

    dataRetrieved = false;

    @wire(getAttributes, {
        deployment: '$deployment'
    })
    attributes({ error, data }) {
        if (data) {
            let parsedData = JSON.parse(data);
            this.attributeList = parsedData.attributeList;
            this.levels = parsedData.levels;
            this.dataRetrieved = true;
//            console.log(JSON.stringify(this.attributeList));
        } else if (error) {
            console.log(error);
        }
    };

    get dataReady() {
        return (this.dataRetrieved) ? true : false;
    }

    @wire(MessageContext)
    messageContext;


    handleCheckboxClick(event) {

        // Walk down the path from checkbox's root node to the current element
        const path = (event.detail.path).split('\u001f').slice(0, -1);

        let current = this.attributeList;
        let ancestors = [];
        path.forEach((ancestorId, index) => {
            current = current.find(el => el.id == ancestorId);
            ancestors.push(current);
            if (index < path.length - 1) current = current._children;
        });

        // Check/Uncheck the current node and all its children
        let currentBranch = [];
        this.checkChildren(current, event.detail.checked, currentBranch);

        // And determine checked/indeterminate status for ancestors
        let checkAncestors = true;
        for (let i = ancestors.length - 2; i >= 0; i--) {
            let anc = ancestors[i];
            if (checkAncestors) {
                if (anc._children.every(element => element.checked == true) && anc.selectable) {
                    anc.checked = true;
                    anc.indeterminate = false;
                } else if (anc._children.every(element => element.checked == false && element.indeterminate == false) && anc.selectable) {
                    anc.checked = false;
                    anc.indeterminate = false;
                } else if (anc._children.some(element => element.checked == true || element.indeterminate == true) && anc.selectable) {
                    anc.checked = false;
                    anc.indeterminate = true;
                    checkAncestors = false; // all other ancestors will be indeterminate, so skip the rest of the processing.
                } else {
                    // Do nothing - "shouldn't" ever happen...
                }
                if (anc.checked == event.detail.checked) currentBranch.push(anc.id);
            } else {
                if(anc.selectable) {
                    anc.checked = false;
                    anc.indeterminate = true;
                    if(anc.checked == event.detail.checked) currentBranch.push(anc.id);
                }
            }
        }

        // Update the current filters for the root node
        let rootFilters = this.getRootFilters(event.detail.root, event.detail.type, "checkbox");

        currentBranch.forEach(el => {
            const currentIndex = rootFilters.values.findIndex(sel => sel == el);
            if (currentIndex >= 0 && !event.detail.checked) {
                rootFilters.values.splice(currentIndex, 1);
            } else if (currentIndex == -1 && event.detail.checked) {
                rootFilters.values.push(el);
            }
        })
        this.selectedAttributes[event.detail.root] = rootFilters;
        this.sendFilters(event.detail.root, rootFilters);
    }

    checkChildren(element, isChecked, elementArray) {
        element.checked = isChecked;
        element.indeterminate = false;
        elementArray.push(element.id);
        if (element.hasChildren) {
            element._children.forEach(el => this.checkChildren(el, isChecked, elementArray));
        }
    }

    handleSingleSelect(event) {
        // Single-Select Picklist/Radio Button
        let rootFilters = this.getRootFilters(event.detail.root, event.detail.type, "single-select");
        if (event.detail.xid != null) {
            rootFilters.values[0] = event.detail.xid;
        } else {
            rootFilters.values.pop();
        }
        this.selectedAttributes[event.detail.root] = rootFilters;
        this.sendFilters(event.detail.root, rootFilters);
    }

    handleMultiSelect(event) {
        // Multi-Select Picklist
        let rootFilters = this.getRootFilters(event.detail.root, event.detail.type, "multi-select");
//        console.log(JSON.stringify(rootFilters));
        if (event.detail.xids != null) {
            rootFilters.values = event.detail.xids;
        } else {
            rootFilters.values = [];
        }
        this.selectedAttributes[event.detail.root] = rootFilters;
//        console.log(JSON.stringify(rootFilters));
        this.sendFilters(event.detail.root, rootFilters);
    }

    handleRangeChange(event) {
        // Numerical Range
        let rootFilters = this.getRootFilters(event.detail.root, event.detail.type, "range");
        rootFilters.range[event.detail.handle] = event.detail.value;
        this.selectedAttributes[event.detail.root] = rootFilters;
        this.sendFilters(event.detail.root, rootFilters);
    }

    handleDateChange(event) {
        // Date From/To Change
        let rootFilters = this.getRootFilters(event.detail.root, event.detail.type, "date-range");
        rootFilters.dateRange[event.detail.name] = event.detail.value;
        this.selectedAttributes[event.detail.root] = rootFilters;
        this.sendFilters(event.detail.root, rootFilters);
    }

    getRootFilters(rootNode, type, filterType) {
        let rootFilters;
        if(typeof this.selectedAttributes[rootNode] != "undefined") {
            rootFilters = this.selectedAttributes[rootNode];
        } else {
            rootFilters = {
                name: rootNode,
                type: type,
                filterType: filterType
            }
            if(filterType == 'checkbox' || filterType == 'single-select' || filterType == 'multi-select') {
                rootFilters.values = [];
            } else if(filterType == 'range') {
                rootFilters.range = {};
            } else if(filterType == 'date-range') {
                rootFilters.dateRange = {};
            }
            if(type == 'attribute') rootFilters.lookupFieldName = this.attributeList.find(el => el.id == rootNode).lookupFieldName;
        }
        return rootFilters;
    }

    sendFilters(rootNode, filters) {
        const appliedFilters = { rootNode, filters };
//        console.log('Root: ' + rootNode + ', Filters: ' + JSON.stringify(filters));
        const payload = { appliedFilters };
        publish(this.messageContext, FILTER_CHANGED_CHANNEL, payload);
    }
}