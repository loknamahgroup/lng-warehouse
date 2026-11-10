package com.branchstock.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

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

    /** Only meaningful for SUBADMIN: names of {@link Permission} granted by an admin. */
    @Builder.Default
    private List<String> permissions = new ArrayList<>();
}
