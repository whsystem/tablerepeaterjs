
//The table must have the class name "table-repeater"
//The repeated row must have the class name "repeat-row"
//Test
(function ($) {
    $.fn.tableRepeater = function (options) {
        var settings = $.extend({
            initEmpty:false,
            firstRowRemovable: false,
            addButton: '.add-row',
            removeButton: '.remove-row',
            maxRows: 10,
            select2Configurations: {}, 
            onInputChange: null, 
            onAdd: null,
            columnsResizable: false,
            fileConfig: null,
            onInvalid:null
        }, options);

        var updateSettings = function (newSettings) {
            settings = $.extend(settings, newSettings);
        };
        var getSettings = function () {
            return settings;
        };
        this.each(function () {
            var $table = $(this);
            let firstRowClone = null;

            // Handle adding a new row
            $table.on('click', settings.addButton, function (e) {
                e.preventDefault();
                var rowCount = $table.find('tr.repeat-row').length;
                let newRow;
                if (rowCount < settings.maxRows && rowCount >= 1) {
                    newRow = $table.find('tr.repeat-row:last').clone();
                    addRow(newRow, rowCount);
                    //newRow.find('input, select').val('').prop('checked', false);
                }
                else if (rowCount == 0 && firstRowClone) {
                    newRow = firstRowClone.clone();
                    firstRowClone = null;
                    addRow(newRow, rowCount);
                }
                
                if (typeof settings.onAdd === 'function') {
                    settings.onAdd(newRow);
                }
                if (settings.fileConfig) {
                    applyFileConfig(newRow);
                }
                updateRemoveButtons(newRow, rowCount);
                if (settings.columnsResizable) {
                    columnResizing($table);
                }
            });

            // Handle removing a row
            $table.on('click', settings.removeButton, function (e) {
                e.preventDefault();
                var $row = $(this).closest('tr');
                var rowCount = $table.find('tr.repeat-row').length;
                if (rowCount > 1) {
                    destroyAllSelect2();
                    $row.remove();
                    $table.find('tr.repeat-row').each(function (index) {
                        renameRowInputs($(this), index);
                    });
                    reinitializeAllSelect2();
                }
                else if (rowCount == 1 && settings.firstRowRemovable) {
                    firstRowClone = $row.clone();
                    $row.remove();

                }
            });

            // Initialize select2 for a specific row
            function initializeSelect2(row) {
                Object.keys(settings.select2Configurations).forEach(function (selector) {
                    $(row).find(selector).each(function () {
                        var config = settings.select2Configurations[selector];
                        $(this).removeClass('select2-hidden-accessible').next('.select2-container').remove();
                        $(this).removeAttr('data-select2-id');
                       
                        $(this).select2(config);
                    });
                });
            }
            function reinitializeAllSelect2() {
                $table.find('tr.repeat-row').each(function () {
                    initializeSelect2(this); // Reinitialize select2 for each row
                });
            }
            function destroyAllSelect2() {
                $table.find('tr.repeat-row').each(function () {
                    $(this).find('select').each(function () {
                        if ($(this).data('select2')) {
                            $(this).select2('destroy');
                        }
                    });
                });
            }
            //Initialize jquery validation options
            function initializeValidation() {
                var formValidator = $table.closest("form").data("validator");
                let scrolledToInvalid = false; 
                if (formValidator) {

                    formValidator.settings.highlight = function (element) {
                        $(element).closest('td').addClass('error-border');
                        $(element).closest('tr').addClass('row-error-border');
                        if ($(element).closest('td').length > 0 && !scrolledToInvalid) {
                            scrolledToInvalid = true;
                            const isRTL = $('html').attr('dir') === 'rtl';
                            let container = $('.table-container');
                            let currentScroll = container.scrollLeft();
                            let elementOffset = isRTL ? $(window).width() - ($(element).offset().left + $(element).outerWidth()) : $(element).offset().left;
                            let containerOffset = isRTL ? $(window).width() - (container.offset().left + container.outerWidth()) : container.offset().left;
                            let offsetAdjustment = elementOffset - containerOffset;
                            let targetScroll = null;
                            if (isRTL) {
                                targetScroll = currentScroll - offsetAdjustment;
                            }
                            else {
                                targetScroll = currentScroll + offsetAdjustment;
                            }
                            console.log({
                                isRTL,
                                currentScroll,
                                offsetAdjustment,
                                targetScroll,
                            });
                            container.stop(true).animate({ scrollLeft: targetScroll }, 500);
                        }
                  

                    };
                    formValidator.settings.unhighlight = function (element) {
                        scrolledToInvalid = false;
                        $(element).closest('td').removeClass('error-border');
                        if ($(element).closest('tr').find('.error-border').length == 0) {
                            $(element).closest('tr').removeClass('row-error-border');
                        }
                 
                    };
                    formValidator.settings.errorPlacement = function (element) {
                        return true;
                    };
                    formValidator.settings.invalidHandler = function (event, validator) {
                        
                    };
                }
            }
            //Rename the id and name for specific row
            function renameRowInputs(newRow,index) {
                newRow.find('input, select, textarea').each(function () {
                    var nameAttr = $(this).attr('name');
                    var idAttr = $(this).attr('id');
                    if (nameAttr) {
                        var newNameAttr = nameAttr.replace(/\[\d+\]/, '[' + index + ']');
                        $(this).attr('name', newNameAttr);
                    }
                    if (idAttr) {
                        var newIdAttr = idAttr.replace(/_\d+__/, '_' + index + '__');
                        $(this).attr('id', newIdAttr);
                    }
                });
              
            }
            //empty inputs except hidden for specific row
            function emptyRowInputs(newRow) {
                newRow.find('input, select, textarea').each(function () {
                    if ($(this).attr('type') !== 'hidden' && $(this).attr('type') !== 'checkbox') {
                        $(this).val('').trigger('change');
                        //.trigger('change')
                    }
                    if ($(this).attr('type') == 'checkbox') {
                        $(this).prop('checked', false);
                    }
                });
            }
            //add new row
            function addRow(newRow,index) {
                renameRowInputs(newRow, index);
                emptyRowInputs(newRow);
                $table.find('tbody').append(newRow);
                reinitializeAllSelect2();
            
            }
            // show/hide remove button for specific row 
            function updateRemoveButtons(row,index) {
                var $removeButton = $(row).find(settings.removeButton);
                if (index === 0 && !settings.firstRowRemovable) {
                    $removeButton.hide();
                } else {
                    $removeButton.show();
                }
            }
            //Files config
            function validateFileInput($fileInput) {
                const files = $fileInput[0].files;
                const config = settings.fileConfig;

                for (const file of files) {
                    // Validate extension if allowedExtensions is defined
                    if (config.allowedExtensions) {
                        const fileExtension = file.name.split('.').pop().toLowerCase();
                        if (!config.allowedExtensions.includes(fileExtension)) {
                                if (typeof settings.onInvalid === 'function') {
                                        settings.onInvalid(`File type not allowed. Allowed types: ${config.allowedExtensions.join(', ')}`);
                                    }
                            $fileInput.val(''); // Clear input
                            return;
                        }
                    }

                    // Validate size if maxSize is defined
                    if (config.maxSize && file.size > config.maxSize) {
                          if (typeof settings.onInvalid === 'function') {
                                  settings.onInvalid(`File size exceeds the limit of ${config.maxSize / (1024 * 1024)}MB`);
                              }
                        $fileInput.val(''); // Clear input
                        return;
                    }
                }
            }
            function applyFileConfig($row) {
                $row.find('input[type="file"]').each(function () {
                    const $fileInput = $(this);
            
                    // Apply multiple attribute
                    if (settings.fileConfig.multiple) {
                        $fileInput.attr('multiple', true);
                    } else {
                        $fileInput.removeAttr('multiple');
                    }

                    // Add change event for validation
                    $fileInput.off('change').on('change', function () {
                        validateFileInput($fileInput);
                    });
                });
            }
            //Resize Columns
            function columnResizing($table) {
                //const isRTL = $table.closest('.table-container').css('direction') === 'rtl'; // Detect RTL
                const isRTL = $('html').attr('dir') === 'rtl';
                // $table.parent().css('overflow-x', 'auto');

                $table.find('th, td').each(function () {
                    const $header = $(this);
                    const $resizer = $('<div class="resizer"></div>');
                    //$header.css('position', 'relative');
                    $header.append($resizer);

                    // Position resizer handle based on direction
                    if (isRTL) {
                        $resizer.css({
                            left: 0, // For RTL, position the resizer at the left edge
                            cursor: 'col-resize',
                            position: 'absolute',
                            top: 0,
                            height: '100%',
                            width: '5px',
                        });
                    } else {
                        $resizer.css({
                            right: 0, // For LTR, position the resizer at the right edge
                            cursor: 'col-resize',
                            position: 'absolute',
                            top: 0,
                            height: '100%',
                            width: '5px',
                        });
                    }

                    // Set explicit initial widths for headers and cells
                    const colIndex = $header.index() + 1;
                    $header.css('width', $header.outerWidth() + 'px');
                    $table.find(`td:nth-child(${colIndex})`).css('width', $header.outerWidth() + 'px');

                    let startX, startWidth;

                    $resizer.on('mousedown', function (e) {
                        startX = e.pageX;
                        startWidth = $header.outerWidth();

                        $(document).on('mousemove', onMouseMove);
                        $(document).on('mouseup', onMouseUp);
                    });

                    function onMouseMove(e) {
                        let movement = e.pageX - startX;
                        if (isRTL) {
                            movement = -movement; // Reverse movement for RTL
                        }

                        const newWidth = Math.max(50, startWidth + movement); // Minimum width = 50px
                        //$header.css('width', newWidth + 'px');
                        $table.find(`th:nth-child(${colIndex}), td:nth-child(${colIndex})`).css('width', newWidth + 'px');

                        // Dynamically adjust the table's width
                        const totalWidth = $table.find('th').toArray().reduce((sum, th) => {
                            return sum + $(th).outerWidth();
                        }, 0);
                        $table.css('width', totalWidth + 'px');
                    }

                    function onMouseUp() {
                        $(document).off('mousemove', onMouseMove);
                        $(document).off('mouseup', onMouseUp);
                    }
                });
            }
            // Generalized input change handler
            $table.on('change', 'input, select', function () {
                if (typeof settings.onInputChange === 'function') {
                    const $input = $(this);
                    const $row = $input.closest('tr'); // Get the parent row
                    const rowIndex = $row.index();
                    settings.onInputChange($input, rowIndex); // Call the callback with the changed element
                }
            });

            initializeValidation();
            if (settings.columnsResizable) {
                columnResizing($table);
            }
            var initRowsCount = $table.find('tr.repeat-row').length;
            // Initialize all rows
            $table.find('tr.repeat-row').each(function (index) {
                initializeSelect2(this);
                updateRemoveButtons(this, index);
                if (settings.initEmpty && settings.firstRowRemovable && initRowsCount == 1) {
                    var $row = $(this);
                    firstRowClone = $row.clone();
                    $row.remove();
                }
            });

            $table.data('tableRepeaterApi', {
                updateSettings: updateSettings,
                getSettings: getSettings
            });
        });
        // Expose the methods to the jQuery object
        //this.updateSettings = updateSettings;
        //this.getSetting = getSetting;
   
        return this; // Allow chaining
    };
})(jQuery);
