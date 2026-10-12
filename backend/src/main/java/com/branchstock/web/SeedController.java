package com.branchstock.web;

import com.branchstock.domain.*;
import com.branchstock.repo.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

@RestController
@RequestMapping("/api/dev/seed")
public class SeedController {

    private final BranchRepository branchRepo;
    private final UserAccountRepository userRepo;
    private final ProductRepository productRepo;
    private final WarehouseStockRepository stockRepo;
    private final BranchHoldingRepository holdingRepo;
    private final StockRequestRepository requestRepo;
    private final PasswordEncoder encoder;

    public SeedController(BranchRepository branchRepo, UserAccountRepository userRepo,
                          ProductRepository productRepo, WarehouseStockRepository stockRepo,
                          BranchHoldingRepository holdingRepo, StockRequestRepository requestRepo,
                          PasswordEncoder encoder) {
        this.branchRepo = branchRepo;
        this.userRepo = userRepo;
        this.productRepo = productRepo;
        this.stockRepo = stockRepo;
        this.holdingRepo = holdingRepo;
        this.requestRepo = requestRepo;
        this.encoder = encoder;
    }

    @PostMapping
    public String seed(@RequestParam(defaultValue = "false") boolean force) {
        if (userRepo.count() > 0 && !force) {
            return "Data already exists. Skipping seed. Pass ?force=true to reseed.";
        }
        if (force || userRepo.count() > 0) {
            requestRepo.deleteAll();
            holdingRepo.deleteAll();
            stockRepo.deleteAll();
            productRepo.deleteAll();
            userRepo.deleteAll();
            branchRepo.deleteAll();
        }
        if (userRepo.count() > 0) {
            return "Data already exists. Skipping seed.";
        }

        Branch downtown = branchRepo.save(Branch.builder()
                .code("DTN").name("Downtown Market").address("12 Market Street").active(true).build());
        Branch north = branchRepo.save(Branch.builder()
                .code("NTH").name("Northside Mart").address("88 North Avenue").active(true).build());
        branchRepo.save(Branch.builder()
                .code("AIR").name("Airport Kiosk").address("Terminal 2, Gate B").active(true).build());

        userRepo.save(UserAccount.builder()
                .username("admin").passwordHash(encoder.encode("Admin@123"))
                .displayName("Warehouse Admin").role(Role.ADMIN).active(true).build());
        userRepo.save(UserAccount.builder()
                .username("downtown").passwordHash(encoder.encode("Branch@123"))
                .displayName("Downtown Manager").role(Role.BRANCH_USER)
                .branchId(downtown.getId()).branchName(downtown.getName()).active(true).build());
        UserAccount northUser = userRepo.save(UserAccount.builder()
                .username("northside").passwordHash(encoder.encode("Branch@123"))
                .displayName("Northside Manager").role(Role.BRANCH_USER)
                .branchId(north.getId()).branchName(north.getName()).active(true).build());

        String[] skus = {"SKU-BEANS", "SKU-MILK", "SKU-CUPS", "SKU-SUGAR", "SKU-NAP"};
        String[] names = {"Arabica Coffee Beans", "Whole Milk", "Paper Cups 12oz", "Sugar Packets", "Napkins"};
        String[] cats = {"Grocery", "Dairy", "Packaging", "Grocery", "Packaging"};
        String[] units = {"kg", "carton", "pack", "box", "pack"};
        int[] reorders = {20, 15, 25, 10, 12};
        int[] stocks = {180, 90, 140, 60, 75};

        Product beans = null, cups = null;
        for (int i = 0; i < skus.length; i++) {
            Product p = productRepo.save(Product.builder()
                    .sku(skus[i]).name(names[i]).category(cats[i])
                    .unit(units[i]).reorderLevel(reorders[i]).active(true).build());
            int reserved = skus[i].equals("SKU-BEANS") ? 12 : 0;
            stockRepo.save(WarehouseStock.builder().productId(p.getId()).onHand(stocks[i]).reserved(reserved).build());
            if (skus[i].equals("SKU-BEANS")) beans = p;
            if (skus[i].equals("SKU-CUPS")) cups = p;
        }

        holdingRepo.save(BranchHolding.builder().branchId(downtown.getId()).branchName(downtown.getName()).productId(beans.getId()).quantity(18).build());
        holdingRepo.save(BranchHolding.builder().branchId(downtown.getId()).branchName(downtown.getName()).productId(cups.getId()).quantity(8).build());
        holdingRepo.save(BranchHolding.builder().branchId(north.getId()).branchName(north.getName()).productId(beans.getId()).quantity(10).build());

        requestRepo.save(StockRequest.builder()
                .branchId(north.getId()).branchName(north.getName())
                .productId(beans.getId()).requestedBy(northUser.getUsername())
                .quantity(12).status(RequestStatus.RESERVED)
                .notes("Weekend restock").createdAt(Instant.now()).build());

        return "Seed completed successfully!";
    }
}
