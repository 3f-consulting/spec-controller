@CHK
Feature: Checkout

  Rule: an order is priced from its basket

    @unit @SCN-CHK-001
    Scenario: the order total is the sum of its line prices

    @unit @SCN-CHK-002
    Scenario: a discount code takes its percentage off the total

    @unit @SCN-CHK-003
    Scenario: an empty basket cannot be checked out
