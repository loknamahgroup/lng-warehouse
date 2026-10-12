package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "branch_holdings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchHolding {

    @Id
    private String id;

    private String branchId;

    private String branchName;

    private String productId;

    @Builder.Default
    private int quantity = 0;
}
