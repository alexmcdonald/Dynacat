/*
 * dynacatFiltersDatatable LWC is used by the Dynacat Configurator Flow, to display the table of configured filters
 * for a deployment and enable Edit / Delete / Create actions to be initiated.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent } from "lightning/flowSupport";

export default class DynacatFiltersDatatable extends LightningElement {

    @api filters = [];

    @api selectedRecord;
    @api selectedId;
    @api action;

    get displayTable() {
        return (this.filters.length > 0) ? true : false;
    }

    actions = [
        { label: 'Edit', name: 'edit' },
        { label: 'Delete', name: 'delete' }
    ];
    
    columns = [
        { label: 'Section / Field / Attribute', fieldName: 'Filter__c' },
        { label: 'Filter Type', fieldName: 'Type__c' },
        { label: 'Order', fieldName: 'Order__c' },
        { label: 'Display Type', fieldName: 'Display_Type__c' },
        { label: 'Object', fieldName: 'Object_API_Name__c' },
        { type: 'action', typeAttributes : { rowActions: this.actions } }
    ];

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        console.log(`'${actionName}: ${JSON.stringify(row)}`);

        this.dispatchEvent(new FlowAttributeChangeEvent('selectedRecord', row));
        this.dispatchEvent(new FlowAttributeChangeEvent('selectedId', row.Id));
        this.dispatchEvent(new FlowAttributeChangeEvent('action', actionName));
        this.dispatchEvent(new FlowNavigationNextEvent());

    }

    handleNew(event) {
        this.dispatchEvent(new FlowAttributeChangeEvent('selectedRecord', null));
        this.dispatchEvent(new FlowAttributeChangeEvent('selectedId', null));
        this.dispatchEvent(new FlowAttributeChangeEvent('action', 'create'));
        this.dispatchEvent(new FlowNavigationNextEvent());
    }

}