package com.branchstock.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleLineItem {

    private String productId;
    private String sku;
    private String productName;
    private int quantity;
    private double price;
    private double amount;
}