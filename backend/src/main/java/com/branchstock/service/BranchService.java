package com.branchstock.service;

import com.branchstock.domain.Branch;
import com.branchstock.dto.BranchDto;
import com.branchstock.repo.BranchRepository;
import com.branchstock.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BranchService {

    private final BranchRepository branchRepo;

    public BranchService(BranchRepository branchRepo) {
        this.branchRepo = branchRepo;
    }

    public List<BranchDto> list() {
        return branchRepo.findAll().stream().map(this::toDto).toList();
    }

    public BranchDto create(BranchDto dto) {
        if (branchRepo.existsByCode(dto.code().trim().toUpperCase())) {
            throw new ApiException("Branch code already exists");
        }
        Branch branch = branchRepo.save(Branch.builder()
                .code(dto.code().trim().toUpperCase())
                .name(dto.name().trim())
                .address(dto.address())
                .active(true)
                .build());
        return toDto(branch);
    }

    public BranchDto update(String id, BranchDto dto) {
        Branch branch = branchRepo.findById(id).orElseThrow(() -> new ApiException("Branch not found"));
        branch.setName(dto.name().trim());
        branch.setAddress(dto.address());
        branch.setActive(dto.active());
        return toDto(branchRepo.save(branch));
    }

    public BranchDto toDto(Branch b) {
        return new BranchDto(b.getId(), b.getCode(), b.getName(), b.getAddress(), b.isActive());
    }
}
