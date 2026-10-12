package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    private String id;

    @Indexed(unique = true)
    private String sku;

    private String name;

    private String category;

    private String unit;

    private String description;

    @Builder.Default
    private int reorderLevel = 10;

    @Builder.Default
    private boolean active = true;
}
