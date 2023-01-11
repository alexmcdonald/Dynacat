/*
 * dynacatTileWall LWC is a mash-up between the dynacatServerCatalog and a demo component I originally built in Aura 
 * a few years ago. As with the Server version, all the filtering and pagination of target records is done in APEX.  
 * It should be much more scalable than the original dynacatCatalog LWC, particularly if support enable indexing 
 * for the fields being filtered.
 *
 * The Tile Wall adds more configurable display options for the filtered records. In the config for the component 
 * you can set which fields should be displayed, how they should be aligned, background colours, images, etc. You can
 * also use a formula field on the record to specify a background colour, background image, or a badge foreground/background
 * colour.  And, SOSL search is built in, which enables full-text searching of all SOSL enabled fields on the records.
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

import { LightningElement, wire, track, api } from 'lwc';
import getDefaultRecords from '@salesforce/apex/DynacatTileWallController.getDefaultRecords';
import getFilteredRecords from '@salesforce/apex/DynacatTileWallController.getFilteredRecords';
import getNextRecords from '@salesforce/apex/DynacatTileWallController.getNextRecords';
import searchRecords from '@salesforce/apex/DynacatTileWallController.searchRecords';

// Import message service features required for subscribing and the message channel
import { subscribe, MessageContext } from 'lightning/messageService';
import FILTER_CHANGED_CHANNEL from '@salesforce/messageChannel/dynacatFilterChanged__c';

export default class DynacatTileWall extends LightningElement {


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

    @track records;
    soql;

    _timeout;

    @track filters = {};

    dataRetrieved = false;
    notConfigured = false;

    // Tile Wall Inputs
    @api title;
    @api iconName;
    @api displayCount;
    @api backgroundColor;

    @api soqlQuery;

    @api allowSearch = false;
    @api searchLabel;
    @api noResultsText;

    @api heightOption;
    @api fixedHeight;

    @api columnsLarge;
    @api columnsMedium;
    @api columnsSmall;

    @api get sizeLarge() { return 12 / parseInt(this.columnsLarge); }
    @api get sizeMedium() { return 12 / parseInt(this.columnsMedium); }
    @api get sizeSmall() { return 12 / parseInt(this.columnsSmall); }

    @api color;
    @api colorFieldName;
    @api imageURL;
    @api imageFieldName;
    @api size;
    @api opacity;

    @api name_Field0;
    @api size_Field0;
    @api case_Field0;
    @api align_Field0;

    @api name_Badge1;
    @api label_Badge1;
    @api color_Badge1;
    @api bgcolor_Badge1;

    @api name_Badge2;
    @api label_Badge2;
    @api color_Badge2;
    @api bgcolor_Badge2;

    @api name_Badge3;
    @api label_Badge3;
    @api color_Badge3;
    @api bgcolor_Badge3;

    @api name_Badge4;
    @api label_Badge4;
    @api color_Badge4;
    @api bgcolor_Badge4;

    @api name_Field1;
    @api label_Field1;
    @api size_Field1;
    @api case_Field1;
    @api align_Field1;

    @api name_Field2;
    @api label_Field2;
    @api size_Field2;
    @api case_Field2;
    @api align_Field2;

    @api name_Field3;
    @api label_Field3;
    @api size_Field3;
    @api case_Field3;
    @api align_Field3;

    @api name_Field4;
    @api label_Field4;
    @api size_Field4;
    @api case_Field4;
    @api align_Field4;

    tileProperties;
    noResults = false;
    queryTerm;

    @track tiles = [];

    get dataReady() {
        return (this.dataRetrieved) ? true : false;
    }

    get columnClass() {
        const colSizeLarge = 12 / parseInt(this.columnsLarge);
        const colSizeMedium = 12 / parseInt(this.columnsMedium);
        const colSizeSmall = 12 / parseInt(this.columnsSmall);
        return `slds-col slds-size_${colSizeSmall}-of-12 slds-large-size_${colSizeLarge}-of-12 slds-medium-size_${colSizeMedium} slds-small-size_${colSizeSmall} slds-p-vertical_small`;
    };


    // Get the default set of records, runs after the Tile properties have been initialised
    getDefault() {
        getDefaultRecords({
            fieldNames: this.tileProperties.fieldNames,
            recordTypeNames: this.recordTypeNames,
            isActiveFieldName: this.isActiveFieldName,
            deployment: this.deployment,
            limitResults: this.limitResults,
            orderBy: this.orderBy
        }).then((result) => {
            if (typeof result != "undefined" && result != null && result != '') {
                let parsedData = JSON.parse(result);
                this.soql = parsedData.soql;
                this.handleResult(parsedData, false);
                this.dataRetrieved = true;
            }
        }).catch((error) => {
            console.log(error.message);
        });
    }


    // Handles the entered search term by executing the search method. If the term is removed then it re-runs the filters
    handleSearch(event) {
        this.queryTerm = event.currentTarget.value;
        if (this.queryTerm.length >= 2) {
            clearTimeout(this._timeout);
            this._timeout = setTimeout(() => { this.search() }, 300);
        } else if (this.queryTerm.length == 0) {
            this.getFiltered();
        }
    }

    search() {
        this.noResults = false;
        searchRecords({
            queryTerm: this.queryTerm,
            soqlStr: JSON.stringify(this.soql)
        }).then((result) => {
            if (typeof result != "undefined" && result != null && result != '') {
                let parsedData = JSON.parse(result);
                this.handleResult(parsedData, false);
            }
        }).catch((error) => {
            console.log(error.message);
        });
    }

    // Handler for message received from the filters component
    handleFilterChange(message) {
        let node = message.appliedFilters;
        this.filters[node.rootNode] = node.filters;

        // Sets a timeout to slow things down
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => { this.getFiltered() }, 300);
    }


    // Gets the filtered records, with or without a search term applied
    getFiltered() {
        getFilteredRecords({
            soqlStr: JSON.stringify(this.soql),
            filtersStr: JSON.stringify(this.filters),
            queryTerm: this.queryTerm
        }).then((result) => {
            if (typeof result != "undefined" && result != null && result != '') {
                let parsedData = JSON.parse(result);
                this.soql = parsedData.soql;
                this.handleResult(parsedData, false);
            } else {
                console.log('getFilteredRecords: No result');
            }
        }).catch((error) => {
            console.log(error.message);
        });
    }

    // Subscribes this component to the filters changed channel
    @wire(MessageContext) messageContext;
    subscribeToMessageChannel() {
        this.subscription = subscribe(
            this.messageContext,
            FILTER_CHANGED_CHANNEL,
            (message) => this.handleFilterChange(message)
        );
    }

    // Handlers for the Next & Previous buttons
    handleNext() {
        this.getMoreRecords(true);
    }
    handlePrevious() {
        this.getMoreRecords(false);
    }

    // Gets the next or previous set of records
    getMoreRecords(more) {
        let offset = (more) ? (this.offset + this.limitResults) : (this.offset - this.limitResults);
        getNextRecords({
            soqlStr: JSON.stringify(this.soql),
            offset: offset,
            queryTerm: this.queryTerm
        }).then((result) => {
            if (typeof result != "undefined" && result != null && result != '') {
                let parsedData = JSON.parse(result);
                this.offset += (more) ? this.limitResults : -this.limitResults;
                this.handleResult(parsedData, true);
            } else {
                console.log('getNextRecords: No result');
            }
        }).catch((error) => {
            console.log(error.message);
        })
    }

    // Helper to process the result from each query and kick off the follow-on methods
    handleResult(parsedData, offset) {
        this.count = parsedData.count;
        if (!offset) this.offset = 0;
        this.records = parsedData.records;
        this.updateProgress();
        if (this.records.length > 0) {
            this.noResults = false;
            this.processRecords();
        } else {
            this.noResults = true;
            this.tiles = [];
        }
    }

    // Updates the record counts and shows the Previous/Next buttons appropriately
    updateProgress() {
        if (this.records.length == 0) {
            this.progressText = 'No records matched the filters.';
        } else {
            this.progressText = 'Showing records ' + (this.offset + 1) + ' to ' + (this.offset + this.records.length) + ' of ' + this.count + ' total.';
        }
        this.showNext = (this.count > (this.offset + this.records.length));
        this.showPrevious = (this.offset > 0);
    }


    // Processes the received records and generates the list of tiles to be displayed
    processRecords() {
        let _records = this.records;
        let tileProperties = this.tileProperties;

        let _tiles = [];
        for (let i = 0; i < _records.length; i++) {
            let tile = {
                id: _records[i].record.Id,
                fields: [],
                badges: []
            };
            // Field Values
            for (let j = 0; j < (tileProperties.fields).length; j++) {
                let field = Object.assign({}, tileProperties.fields[j]);
                field.value = this.processValue(field.name, _records[i].record);
                if (field.value) {
                    if (field.hasCase) {
                        if (field.case == "lowercase") field.value = (field.value).toLowerCase();
                        else if (field.case == "uppercase") field.value = (field.value).toUpperCase();
                    }
                    field.hasValue = true;
                }
                tile.fields.push(field);
            }
            // Badge Values
            for (var j = 0; j < (tileProperties.badges).length; j++) {
                let badge = Object.assign({}, tileProperties.badges[j]);
                badge.value = this.processValue(badge.name, _records[i].record);
                if (badge.hasColorFieldName) {
                    badge.color = this.processValue(badge.colorFieldName, _records[i].record);
                }
                if (badge.hasBGColorFieldName) {
                    badge.bgColor = this.processValue(badge.bgColorFieldName, _records[i].record);
                }
                if (badge.value) badge.hasValue = true;
                tile.badges.push(badge);
            }

            // Tile-specific styles
            let imageURL;
            let color;
            let tileBackground = '';
            if (tileProperties.hasImageField) imageURL = this.processValue(tileProperties.imageFieldName, _records[i].record);
            if (!imageURL && tileProperties.hasImageURL) imageURL = tileProperties.imageURL;
            if (tileProperties.hasColorField) color = this.processValue(tileProperties.colorFieldName, _records[i].record);
            if (!color && tileProperties.hasColor) color = tileProperties.color;
            if (tileProperties.hasOpacity) {
                const bgRGB = (color) ? this.hexToRgb(color) : this.hexToRgb("#FFFFFF");
                tileBackground += `linear-gradient(rgb(${bgRGB.r},${bgRGB.g},${bgRGB.b},${tileProperties.opacity}), rgb(${bgRGB.r},${bgRGB.g},${bgRGB.b},${tileProperties.opacity}))`;
                if (imageURL) {
                    tileBackground += `, url('${imageURL}') no-repeat center`;
                    if (tileProperties.hasSize) tileBackground += `/${tileProperties.size} `;
                }
            } else {
                if (color) {
                    tileBackground += `${color} `;
                }
                if (imageURL) {
                    tileBackground += `url('${imageURL}') no-repeat center`;
                    if (tileProperties.hasSize) tileBackground += `/${tileProperties.size} `;
                }
            }
            tile.tileBackground = tileBackground;

            let tileHeight = '';
            if (tileProperties.hasFixedHeight && (tileProperties.hasHeightOption && tileProperties.heightOption == 'fixed') || (!tileProperties.hasHeightOption)) {
                tileHeight = tileProperties.fixedHeight;
            } else if (tileProperties.hasHeightOption && tileProperties.heightOption == "max-row") {
                tileHeight = "calc(100% - 24px)";
            }
            tile.tileHeight = tileHeight;

            _tiles.push(tile);
        }
        this.tiles = _tiles;
    }

    // Helper to process possible parent record fields/badges/styles that are displayed on the tile
    processValue(fieldname, record) {
        if (fieldname.indexOf('.') > 0) {
            const fieldArray = fieldname.split('.');
            const objPart = fieldArray[0];
            const valPart = fieldArray[1];
            return record[objPart][valPart];
        } else {
            return record[fieldname];
        }
    }


    // Helper to convert a hex-formatted color into an rgb one
    hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }



    initializeTileWall() {

        // Tile Wall Initialisation
        let _tileProperties = {
            fieldNames: [],
            fields: [],
            badges: []
        };

        let fieldListArr = [];

        // Process Field config
        for (let i = 0; i <= 4; i++) {
            const fieldName = this["name_Field" + i];
            const fieldLabel = this["label_Field" + i];
            const fieldSize = this["size_Field" + i];
            const fieldCase = this["case_Field" + i];
            const fieldAlign = this["align_Field" + i];

            let field = {};

            if (fieldName) {
                const fieldNameLC = fieldName.toLowerCase();
                if (!fieldListArr.includes(fieldNameLC)) {
                    fieldListArr.push(fieldNameLC);
                    _tileProperties.fieldNames.push(fieldName);
                }
                field.num = i;
                field.name = fieldName;
                field.class = 'slds-item_detail';
                if (fieldLabel) {
                    field.label = fieldLabel;
                    field.hasLabel = true;
                }
                if (fieldSize) {
                    field.class += " slds-text-" + fieldSize;
                    field.hasSize = true;
                }
                if (fieldCase) {
                    field.case = fieldCase;
                    field.hasCase = true;
                }
                if (fieldAlign) {
                    field.class += " slds-text-align_" + fieldAlign;
                    field.hasAlign = true;
                }
                (_tileProperties.fields).push(field);
            }
        }

        // Process Badge config
        for (let i = 1; i <= 4; i++) {
            const badgeName = this["name_Badge" + i];
            const badgeLabel = this["label_Badge" + i];
            const badgeColor = this["color_Badge" + i];
            const badgeBGColor = this["bgcolor_Badge" + i];

            let badge = {};

            if (badgeName) {
                const badgeNameLC = badgeName.toLowerCase();
                if (!fieldListArr.includes(badgeNameLC)) {
                    fieldListArr.push(badgeNameLC);
                    _tileProperties.fieldNames.push(badgeName);
                }
                badge.num = i;
                badge.name = badgeName;
                if (badgeLabel) {
                    badge.label = badgeLabel;
                    badge.hasLabel = true;
                }
                if (badgeColor) {
                    if (badgeColor.startsWith("{{")) {
                        badge.colorFieldName = badgeColor.replace(/[{}]+/g, "");
                        if (!fieldListArr.includes(badge.colorFieldName)) {
                            fieldListArr.push(badge.colorFieldName);
                            _tileProperties.fieldNames.push(badge.colorFieldName);
                        }
                        badge.hasColorFieldName = true;
                    } else {
                        badge.color = badgeColor;
                        badge.hasColor = true;
                    }
                }
                if (badgeBGColor) {
                    if (badgeBGColor.startsWith("{{")) {
                        badge.bgColorFieldName = badgeBGColor.replace(/[{}]+/g, "");
                        if (!fieldListArr.includes(badge.bgColorFieldName)) {
                            fieldListArr.push(badge.bgColorFieldName);
                            _tileProperties.fieldNames.push(badge.bgColorFieldName);
                        }
                        badge.hasBGColorFieldName = true;
                    } else {
                        badge.bgColor = badgeBGColor;
                        badge.hasBGColor = true;
                    }
                }
                (_tileProperties.badges).push(badge);
            }
        }

        // Process Background Image options
        if (this.imageFieldName) {
            const imageFieldNameLC = this.imageFieldName.toLowerCase();
            if (!fieldListArr.includes(imageFieldNameLC)) {
                fieldListArr.push(imageFieldNameLC);
                _tileProperties.fieldNames.push(this.imageFieldName);
                _tileProperties.imageFieldName = this.imageFieldName;
                _tileProperties.hasImageField = true;
            }
        }
        if (this.imageURL) {
            _tileProperties.imageURL = this.imageURL;
            _tileProperties.hasImageURL = true;
        }
        if (this.colorFieldName) {
            const colorFieldNameLC = this.colorFieldName.toLowerCase();
            if (!fieldListArr.includes(colorFieldNameLC)) {
                fieldListArr.push(colorFieldNameLC);
                _tileProperties.fieldNames.push(this.colorFieldName);
                _tileProperties.colorFieldName = this.colorFieldName;
                _tileProperties.hasColorField = true;
            }
        }
        if (this.color) {
            _tileProperties.color = this.color;
            _tileProperties.hasColor = true;
        }
        if (this.opacity) {
            _tileProperties.opacity = this.opacity;
            _tileProperties.hasOpacity = true;
        }
        if (this.size) {
            _tileProperties.size = this.size;
            _tileProperties.hasSize = true;
        }

        // Process Height configs
        if (this.heightOption) {
            _tileProperties.heightOption = this.heightOption;
            _tileProperties.hasHeightOption = true;
        }
        if (this.fixedHeight) {
            _tileProperties.fixedHeight = this.fixedHeight;
            _tileProperties.hasFixedHeight = true;
        }

        this.tileProperties = _tileProperties;

        // Get the base set of records
        try {
            if(this.tileProperties.fields[0].name) this.getDefault(false);
        } catch(error) {
            console.log(JSON.stringify(error.message));
        }

    }

    connectedCallback() {
        this.subscribeToMessageChannel();
        this.initializeTileWall();

        if(!this.deployment || !this.name_Field0) {
            this.notConfigured = true;
        }
    }

    _hasRendered = false;
    renderedCallback() {
        if (!this._hasRendered && this.backgroundColor) {
            // Verify whether :host{} variables are inherited from the parent
            let computedStyles = window.getComputedStyle(this.template.host, null);
            let backgroundColor = computedStyles.getPropertyValue('--backgroundColor');

            // When accent color was not yet defined, define the variable
            if (!backgroundColor || backgroundColor.length == 0) {
                this.template.host.style.setProperty('--backgroundColor', this.backgroundColor);
                this._hasRendered = true;
            }

        }
    }


}