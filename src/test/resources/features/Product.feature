@products
Feature: Product Listing Module

  Background:
    Given I navigate to SauceDemo website
    And I log in as standard user

  @smoke @regression
  Scenario: Add and Remove Item to/from Cart
    When I add product for scenario "add_remove_item" to cart
    Then the cart badge count should be 1
    And I remove product for scenario "add_remove_item" from cart
    Then the cart badge should not be displayed

  @regression
  Scenario: Product Sorting A to Z
    When I sort products by option for scenario "sort_az"
    Then the first product name should match the expected for scenario "sort_az"

  @regression
  Scenario: Product Sorting Z to A
    When I sort products by option for scenario "sort_za"
    Then the first product name should match the expected for scenario "sort_za"

  @sanity @regression
  Scenario: Product Sorting Price Low to High
    When I sort products by option for scenario "sort_lohi"
    Then the first product name should match the expected for scenario "sort_lohi"

  @regression
  Scenario: Product Sorting Price High to Low
    When I sort products by option for scenario "sort_hilo"
    Then the first product name should match the expected for scenario "sort_hilo"
