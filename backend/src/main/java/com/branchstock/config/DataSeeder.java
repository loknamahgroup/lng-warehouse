package com.branchstock.config;

import com.branchstock.domain.Branch;
import com.branchstock.domain.BranchHolding;
import com.branchstock.domain.Product;
import com.branchstock.domain.RequestStatus;
import com.branchstock.domain.Role;
import com.branchstock.domain.StockRequest;
import com.branchstock.domain.UserAccount;
import com.branchstock.domain.WarehouseStock;
import com.branchstock.repo.BranchHoldingRepository;
import com.branchstock.repo.BranchRepository;
import com.branchstock.repo.ProductRepository;
import com.branchstock.repo.StockRequestRepository;
import com.branchstock.repo.UserAccountRepository;
import com.branchstock.repo.WarehouseStockRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    ApplicationRunner seedData(
            BranchRepository branchRepo,
            UserAccountRepository userRepo,
            ProductRepository productRepo,
            WarehouseStockRepository stockRepo,
            BranchHoldingRepository holdingRepo,
            StockRequestRepository requestRepo,
            PasswordEncoder encoder
    ) {
        return args -> {
            if (userRepo.count() > 0) {
                return;
            }

            Branch downtown = branchRepo.save(Branch.builder()
                    .code("DTN").name("Downtown Market").address("12 Market Street").active(true).build());
            Branch north = branchRepo.save(Branch.builder()
                    .code("NTH").name("Northside Mart").address("88 North Avenue").active(true).build());
            branchRepo.save(Branch.builder()
                    .code("AIR").name("Airport Kiosk").address("Terminal 2, Gate B").active(true).build());

            userRepo.save(UserAccount.builder()
                    .username("admin")
                    .passwordHash(encoder.encode("Admin@123"))
                    .displayName("Warehouse Admin")
                    .role(Role.ADMIN)
                    .active(true)
                    .build());
            userRepo.save(UserAccount.builder()
                    .username("downtown")
                    .passwordHash(encoder.encode("Branch@123"))
                    .displayName("Downtown Manager")
                    .role(Role.BRANCH_USER)
                    .branchId(downtown.getId())
                    .branchName(downtown.getName())
                    .active(true)
                    .build());
            UserAccount northUser = userRepo.save(UserAccount.builder()
                    .username("northside")
                    .passwordHash(encoder.encode("Branch@123"))
                    .displayName("Northside Manager")
                    .role(Role.BRANCH_USER)
                    .branchId(north.getId())
                    .branchName(north.getName())
                    .active(true)
                    .build());

            List<Product> products = List.of(
                    product("SKU-BEANS", "Arabica Coffee Beans", "Grocery", "kg", 20),
                    product("SKU-MILK", "Whole Milk", "Dairy", "carton", 15),
                    product("SKU-CUPS", "Paper Cups 12oz", "Packaging", "pack", 25),
                    product("SKU-SUGAR", "Sugar Packets", "Grocery", "box", 10),
                    product("SKU-NAP", "Napkins", "Packaging", "pack", 12)
            );

            for (Product p : products) {
                p = productRepo.save(p);
                int onHand = switch (p.getSku()) {
                    case "SKU-BEANS" -> 180;
                    case "SKU-MILK" -> 90;
                    case "SKU-CUPS" -> 140;
                    case "SKU-SUGAR" -> 60;
                    default -> 75;
                };
                int reserved = p.getSku().equals("SKU-BEANS") ? 12 : 0;
                stockRepo.save(WarehouseStock.builder().productId(p.getId()).onHand(onHand).reserved(reserved).build());
            }

            Product beans = productRepo.findBySku("SKU-BEANS").orElseThrow();
            Product cups = productRepo.findBySku("SKU-CUPS").orElseThrow();

            holdingRepo.save(BranchHolding.builder().branchId(downtown.getId()).branchName(downtown.getName()).productId(beans.getId()).quantity(18).build());
            holdingRepo.save(BranchHolding.builder().branchId(downtown.getId()).branchName(downtown.getName()).productId(cups.getId()).quantity(8).build());
            holdingRepo.save(BranchHolding.builder().branchId(north.getId()).branchName(north.getName()).productId(beans.getId()).quantity(10).build());

            requestRepo.save(StockRequest.builder()
                    .branchId(north.getId())
                    .branchName(north.getName())
                    .productId(beans.getId())
                    .requestedBy(northUser.getUsername())
                    .quantity(12)
                    .status(RequestStatus.RESERVED)
                    .notes("Weekend restock")
                    .createdAt(Instant.now())
                    .build());
        };
    }

    private Product product(String sku, String name, String category, String unit, int reorder) {
        return Product.builder()
                .sku(sku)
                .name(name)
                .category(category)
                .unit(unit)
                .reorderLevel(reorder)
                .active(true)
                .build();
    }
}
