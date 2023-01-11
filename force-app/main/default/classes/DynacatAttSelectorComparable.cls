/*
 * Helper class used to sort the attributes by the Order field
 * Used by the DynacatAttSelectorController.cls
 *
 * DISCLAIMER: This is sample code only released under the CC0.
 * It is not of production quality, and is not warranted for quality or fitness 
 * for purpose by me or my employer.
*/

global class DynacatAttSelectorComparable implements Comparable {

    public DynacatAttSelectorController.Attribute attribute;
    
    // Constructor
    public DynacatAttSelectorComparable(DynacatAttSelectorController.Attribute attrib) {
        attribute = attrib;
    }
    
    // Compare Attributes based on the order.
    global Integer compareTo(Object compareTo) {
        // Cast argument to AttributeWrapper
        DynacatAttSelectorComparable compareToAttribute = (DynacatAttSelectorComparable)compareTo;
        
        // The return value of 0 indicates that both elements are equal.
        Integer returnValue = 0;
        if (attribute.order > compareToAttribute.attribute.order) {
            // Set return value to a positive value.
            returnValue = 1;
        } else if (attribute.order < compareToAttribute.attribute.order) {
            // Set return value to a negative value.
            returnValue = -1;
        } else if ((attribute.order == null) && (compareToAttribute.attribute.order != null)){
            // nulls-first implementation
            returnValue = -1;
        } else if ((attribute.order != null) && (compareToAttribute.attribute.order == null)){
            // nulls-first implementation
            returnValue = 1;
        }        
        return returnValue;       
    }
}