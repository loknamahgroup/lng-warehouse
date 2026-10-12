package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "warehouse_stock")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseStock {

    @Id
    private String id;

    private String productId;

    @Builder.Default
    private int onHand = 0;

    @Builder.Default
    private int reserved = 0;

    public int getAvailable() {
        return onHand - reserved;
    }
}
