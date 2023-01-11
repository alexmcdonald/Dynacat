# Dynacat

Dynacat is a collection of sample Salesforce LWC components (and supporting Apex classes, custom objects, and a configurator flow) to demonstrate an implementation of a filterable record catalog such as a product catalog.

This is an updated version of the Dynacat-V1 repository, as it's had a pretty major re-write, adding support for:
* Server (Apex) based filtering and pagination, rather than client (Javascript) based, enabling much larger datasets to be used. Client-based version is still included and is up-to-date in functionality, it's a good choice for smaller datasets as filtering is typically very fast.
* Many more filter types, expanding from the original checkboxes to picklists, radio buttons, dual list-boxes, range sliders, and date selectors
* Ability to add sections
* Can use fields from the target object or any parent object as filters, as well as Attribute objects.  Fields are easier to manage, and are the only options for range sliders and date selectors, but they don't allow nesting of filter checkboxes (to any level) like Attributes do.
* Tile Wall catalog variant mashes up Dynacat with an older demo component I built a few years ago in Aura.  Tile Wall enables quite a bit of configuration of the filtered records.


# Tile Wall

## What Is It?

Tile Wall is a super-flexible, easy to configure Lightning Component to display Salesforce records as a series of tiles.  It can be instantly added to any Lightning pages including communities, and works fine in the Salesforce app.

## How Flexible?

* Present any Salesforce Object
* Choose any field as the tile title
* Choose any four fields from the object (or from a related record) as fields to display
* Choose any four fields from the object (or from a related record) as badges to display
* Lots of options around field alignment and style
* Lots of badge color options, including dynamic coloring based on a formula field
* Set background colors, background images, or dynamic background images based on a field
* Choose the number of columns and records to load at a time
* Sort by any field/s
* Choose to allow search (SOSL-based) or not
* ...



## Setup

All configuration is done within the component, by dragging it onto the page.

**NB:  All fieldnames are case sensitive!!**


## Notes

##### Dynamic Tile/Badge Coloring

Use a formula field such as the one below to define dynamic coloring for tile backgrounds and badge foregrounds or backgrounds.

```
CASE(TEXT(Status),
"New", "#00DD00",
"Escalated", "#EE0000",
"#1C1C1C")
```

In the Tile Wall config, use `{{MyFieldName__c}}` in the relevant color attribribute.  The field can also exist on a related record - eg. you could color a Case tile based on the `{{Account.Customer_Priority__c}}`


##### Tile Background Images

A default tile background image can be set.  You can also over-ride that image with a field on the record (or related record).  Background images don't appear in the Salesforce app or mobile web (at least on iOS), instead they fallback to the tile background color, if set.

The Tile Background Image Size attribute accepts any value from the CSS background-size property, see https://www.w3schools.com/cssref/css3_pr_background-size.asp.  I use `cover` mostly.
