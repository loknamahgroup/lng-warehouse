package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * One bulk warehouse update performed by an admin. Contains many product
 * quantity updates under a single unique intake number.
 */
@Document(collection = "stock_intakes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockIntake {

    @Id
    private String id;

    /** Human readable unique number, e.g. GRN-20260914-0001. */
    @Indexed(unique = true)
    private String intakeNo;

    /** ADD = add to current stock, SET = set absolute on-hand. */
    @Builder.Default
    private String mode = "ADD";

    /** Where the stock came from, e.g. supplier name. */
    private String supplier;

    /** Free text reference, e.g. supplier invoice / PO / GRN doc number. */
    private String referenceNo;

    /** Name typed by admin (defaults to logged-in display name). */
    private String updatedBy;

    /** Username of logged-in admin who saved the batch. */
    private String updatedByUsername;

    private String note;

    private String details;

    @Builder.Default
    private List<StockIntakeLine> lines = new ArrayList<>();

    @Builder.Default
    private int totalQuantity = 0;

    /** Sum of quantity * unitCost across lines (informational). */
    @Builder.Default
    private double totalCost = 0;

    @Builder.Default
    private int lineCount = 0;

    private Instant createdAt;
}
