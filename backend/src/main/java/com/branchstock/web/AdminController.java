package com.branchstock.web;

import com.branchstock.dto.ChangePasswordRequest;
import com.branchstock.dto.CreateUserRequest;
import com.branchstock.dto.DashboardDto;
import com.branchstock.dto.UserDto;
import com.branchstock.service.DashboardService;
import com.branchstock.service.UserAdminService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AdminController {

    private final DashboardService dashboardService;
    private final UserAdminService userAdminService;

    public AdminController(DashboardService dashboardService, UserAdminService userAdminService) {
        this.dashboardService = dashboardService;
        this.userAdminService = userAdminService;
    }

    @GetMapping("/dashboard")
    public DashboardDto dashboard() {
        return dashboardService.load();
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> users() {
        return userAdminService.list();
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto createUser(@RequestBody CreateUserRequest request) {
        return userAdminService.create(request);
    }

    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto updateUser(@PathVariable String id, @RequestBody CreateUserRequest request) {
        return userAdminService.update(id, request);
    }

    @PostMapping("/users/{id}/change-password")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> changePassword(@PathVariable String id, @RequestBody ChangePasswordRequest request) {
        userAdminService.changePassword(id, request, true);
        return Map.of("message", "Password updated");
    }
}
