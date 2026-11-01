package com.branchstock.service;

import com.branchstock.domain.StockRequest;
import com.branchstock.dto.StockRequestDto;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ApprovalCopyService {

    public ByteArrayInputStream generateApprovalCopy(StockRequestDto requestDto) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Approval Copy");
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeight(si -> {});
            XSSFFont boldFont = (XSSFFont) workbook.createFont();
            boldFont.setBold(true);

            Row headerRow = sheet.createRow(0);
            String[] headers = {"#", "Product", "SKU", "Unit", "Requested Qty", "Approved Qty", "Status", "Notes"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                CellStyle headerStyle = workbook.createCellStyle();
                headerStyle.setFont(boldFont);
                headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
                headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                cell.setCellStyle(headerStyle);
            }

            List<StockRequest.LineItem> lines = requestDto.getLines();
            int rowNum = 1;
            for (int i = 0; i < lines.size(); i++) {
                StockRequest.LineItem line = lines.get(i);
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(line.getProductName());
                row.createCell(2).setCellValue(line.getSku());
                row.createCell(3).setCellValue(line.getUnit());
                row.createCell(4).setCellValue(line.getRequestedQuantity());
                row.createCell(5).setCellValue(line.getApprovedQuantity());

                String statusText = line.getStatus() != null ? line.getStatus().name() : "PENDING";
                Cell statusCell = row.createCell(6);
                statusCell.setCellValue(statusText);

                String notes = line.getNotes() != null ? line.getNotes() : "";
                row.createCell(7).setCellValue(notes);

                CellStyle statusStyle = workbook.createCellStyle();
                if (statusText.equals("APPROVED")) {
                    statusStyle.setFillForegroundColor(IndexedColors.GREEN.getIndex());
                } else if (statusText.equals("REJECTED")) {
                    statusStyle.setFillForegroundColor(IndexedColors.RED.getIndex());
                } else {
                    statusStyle.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
                }
                statusStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                statusCell.setCellStyle(statusStyle);
            }

            Row summaryRow = sheet.createRow(rowNum);
            summaryRow.createCell(0).setCellValue("Total Requested:");
            summaryRow.createCell(4).setCellValue(requestDto.getTotalQuantity());
            summaryRow.createCell(5).setCellValue(requestDto.getTotalQuantity());

            CellStyle summaryStyle = workbook.createCellStyle();
            summaryStyle.setBold(true);
            Row summaryRow2 = sheet.createRow(rowNum + 1);
            summaryRow2.createCell(0).setCellValue("Generated At:");
            summaryRow2.createCell(4).setCellValue(Instant.now().toString());
            summaryRow2.createCell(5).setCellValue(requestDto.getBranchName());

            sheet.autoSizeColumns(0, headers.length);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate approval copy", e);
        }
    }
}