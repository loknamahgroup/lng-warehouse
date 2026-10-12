package com.branchstock.web;

import com.branchstock.dto.BranchDto;
import com.branchstock.service.BranchService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchService branchService;

    public BranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    @GetMapping
    public List<BranchDto> list() {
        return branchService.list();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public BranchDto create(@RequestBody BranchDto dto) {
        return branchService.create(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public BranchDto update(@PathVariable String id, @RequestBody BranchDto dto) {
        return branchService.update(id, dto);
    }
}
