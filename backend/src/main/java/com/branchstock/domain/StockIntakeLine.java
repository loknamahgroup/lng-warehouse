package com.branchstock.domain;

import lombok.*;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockIntakeLine {

    private String productId;

    private String sku;

    private String productName;

    private String category;

    private String unit;

    /** Quantity entered by admin: meaning depends on parent mode (ADD or SET). */
    private int quantity;

    /** Optional per-unit purchase cost entered by admin. */
    @Builder.Default
    private double unitCost = 0;

    /** quantity * unitCost snapshot. */
    @Builder.Default
    private double lineCost = 0;

    /** Snapshot of on-hand before this intake was applied. */
    private int previousOnHand;

    /** Snapshot of on-hand after this intake was applied. */
    private int newOnHand;
}
