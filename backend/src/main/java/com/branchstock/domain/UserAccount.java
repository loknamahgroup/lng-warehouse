package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashMap;
import java.util.Map;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String passwordHash;

    private String displayName;

    private Role role;

    private String branchId;

    private String branchName;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private Map<String, Boolean> subadminConfig = new HashMap<>();
}
