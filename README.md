# Dynacat

Dynacat is a collection of sample Salesforce LWC components (and supporting Apex classes and custom objects) to demonstrate an implementation of a filterable record catalog such as a product catalog.

In its initial version it supports a series of nested checkbox-style filters, utilising a custom object (Attribute) to define each filter value in the hierarchy, and a junction object (Record Attribute) to save the relevant filters against each record.  An LWC is used to select the filters for a record.  Additional LWCs allow the selection of filters, and display the filtered view on any Lightning page and/or Community page.

The component includes a sample target object (Dynacat Product) but is designed to work with any object, a lookup to the Product2 object is included in the Record Attribute junction object.

Down the track I would like to extend the package to include other types of filters:
 - drop-downs and multi-select dropdowns
 - radio buttons
 - number ranges
 - text searching
 
... and also include the option to use fields from the target object itself rather than just the stand-alone Attribute object.