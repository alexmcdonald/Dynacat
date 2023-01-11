// Very basic test stubs only
//
@isTest
private class DynacatTests {

    @testSetup static void setupTestData() {
        Product2 p = new Product2();
        p.Name = 'Test Product';
      //  p.External_Id__c = 'T123';
      //  p.Status__c = 'Active';
        insert(p);
        
        Dynacat_Attribute__c a = new Dynacat_Attribute__c();
        a.Name = 'Test Root Attribute';
        a.Order__c = 1;
        a.Selectable__c = true;
        a.Active__c = true;
        a.External_Id__c = 'T0';
        insert(a);
        
        Dynacat_Attribute__c a2 = new Dynacat_Attribute__c();
        a2.Name = 'Test Child Attribute';
        a2.Order__c = 1;
        a2.Selectable__c = true;
        a2.Active__c = true;
        a2.External_Id__c = 'T1';
        a2.Parent_Attribute__c = a.Id;
        insert(a2);  
        
        Dynacat_Attribute__c a3 = new Dynacat_Attribute__c();
        a3.Name = 'Test Grandchild Attribute';
        a3.Order__c = 1;
        a3.Selectable__c = true;
        a3.Active__c = true;
        a3.External_Id__c = 'T2';
        a3.Parent_Attribute__c = a2.Id;
        insert(a3); 
        
        Dynacat_Attribute__c a4 = new Dynacat_Attribute__c();
        a4.Name = 'Test Child Attribute 2';
        a4.Order__c = 2;
        a4.Selectable__c = true;
        a4.Active__c = true;
        a4.External_Id__c = 'T3';
        a4.Parent_Attribute__c = a.Id;
        insert(a4); 
        
        List<String> atts = new List<String>{a2.External_Id__c};
        DynacatAttSelectorController.saveRecordAttributes(JSON.serialize(atts), p.Id, 'Product2', 'Product2__c', 'Id');
        
    }
    
    @isTest static void testAttributes() {
        Product2 p = [SELECT Id FROM Product2 WHERE Name='Test Product'];
        Test.startTest();
        String attributes = DynacatAttSelectorController.getActiveAttributes(p.Id, 'Product2', 'Product2__c');
        Test.stopTest();
        System.debug(attributes);
    }
    @isTest static void testAttributeSave() {
        Product2 p = [SELECT Id FROM Product2 WHERE Name='Test Product'];
        Dynacat_Attribute__c a = [SELECT External_Id__c FROM Dynacat_Attribute__c WHERE Name = 'Test Grandchild Attribute'];
        List<String> atts = new List<String>{a.External_Id__c};
        Test.startTest();
        DynacatAttSelectorController.saveRecordAttributes(JSON.serialize(atts), p.Id, 'Product2', 'Product2__c', 'Id');
        Test.stopTest();
    }
    @isTest static void testCatalog2() {
        Test.startTest();
        String attributes = DynacatCatalogFiltersController.getActiveAttributes();
        Test.stopTest();
        System.debug(attributes);   
    }
    @isTest static void testCatalog() {
        Test.startTest();
//        String prods = CatalogMethods.getActiveProducts();
        Test.stopTest();
    }
   
}