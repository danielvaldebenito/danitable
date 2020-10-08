
(function ($) {
    // Declaración del plugin.
    $.fn.danitable = function (options) {
        // Obtenemos los parámetros.
        options = $.extend({}, $.fn.danitable.defaultOptions, options);

        $(this).data('options', options);
        this.each(async function () {
            const element = $(this);
            element.addClass(options.element_class);

            element.data('selected', []);
            element.data('rowCount', 0);
            element.data('filters', {});
            /** Eventos generales */

            $(document).click(function(e) {
                if($(e.target).closest('.danitable-dropdown').length) {
                    return;
                }
                $('.danitable-dropdown').each(function(d, dd) {
                    if ($(dd).is(':visible')) {
                        $(dd).slideUp();
                    }
                })
            });
            // Evento cuando se selecciona o deselecciona una fila
            $(element).on('danitable:select', function (ev, rowData, checked) {
                let key = options.key;
                if (!key) {
                    console.warn('Debe indicar una clave para la selección');
                    key = 'userId';
                }

                console.log(rowData);

                $(this).trigger('changeSelection', [
                    $(element).data('selected'),
                    rowData,
                    checked,
                ]);
            });

            // Evento cuando se selecciona o deselecciona una fila
            $(element).on('danitable:selectall', function (ev, checked) {
                let key = options.key;
                if (!key) {
                    console.warn('Debe indicar una clave para la selección');
                    key = 'userId';
                }
                const rows = $(element).data('dataRows') || [];
                const selected = checked ? rows.map(m => m[key]) : [];
                $(element).data('selected', selected);
                $(this).trigger('changeSelection', [
                    $(element).data('selected'),
                    null,
                    checked,
                ]);
                $(element)
                    .find('input:checkbox')
                    .each(function(i, input) {
                        if ($(input).is(':visible')) {
                            $(input).prop('checked', checked);
                        }
                    })
            });


            let danitableFilters = {};

            let danitableRows = [];

            /**
             * Funciones de manejo del DOM
             */

            async function initDanitable() {
                // Limpia elemento
                $(element).empty();
                // Obtiene la data de la url seteada.
                const rows = await getJsonData(options.url, options.headers, options.postData);
                if (!rows) {
                    return true;
                }
                $(element).data('dataRows', rows);
                const main = createMain(rows);
                if (main) {
                    main.appendTo(element);
                }
            }

            function createMain(rows) {
                return $(element).append(
                    $('<div>', { class: 'danitable-main' })
                        .append(
                            $('<div>', {
                                class: 'danitable-header',
                                text: options.title,
                            }).append(
                                $('<button>', {
                                    class: 'danitable-header-button',
                                })
                                    .click(function () {
                                        initDanitable().then((ok) => {});
                                    })
                                    .append(
                                        $('<i>', { class: 'fa fa-refresh' })
                                    )
                            )
                        )

                        .append(createTable(rows))
                );
            }

            /** Crea tabla principal */
            function createTable(rows) {
                return $('<table>')
                    .addClass('danitable-table')
                    .append(createTHead(rows))
                    .append(createTBody(rows));
            }

            /** Crea encabezado */
            function createTHead(rows) {
                return $('<thead>').append(rows && rows.length ? createHeaders(rows) : 'No hay resultados');
            }

            /** Crea fila de encabezado */
            function createHeaders(rows) {
                // 1. Obtiene las columnas
                const columns = getColumns(rows);
                // Valida si hay columnas
                if (!columns || !columns.length) {
                    // TODO: Poner un aviso en pantalla para cuando no hayan columnas
                    return true;
                }
                const tr = $('<tr>');
                // Agrega columna de selección
                tr.append(createSelectionColumn());
                // Agrega las columnas
                for (const col of columns) {
                    tr.append(createColumn(col, rows));
                }

                return tr;
            }

            /** Crea columna de selección */
            function createSelectionColumn() {
                const th = $('<th>')
                    // Check
                    .append(
                        $('<label>', {
                            class:
                                'danitable-select-option-check danitable-select-option-row danitable-select-option-row-header',
                        })
                            .append(
                                // Checkbox
                                $('<input>', {
                                    type: 'checkbox',
                                    checked: false,
                                })
                                .change(function () {
                                    const checked = this.checked;
                                    // $('.danitable-row', element).each(function (r, rowCheck) {
                                    //     $(rowCheck).trigger('danitable:selectrow', [ checked ]);
                                    //     $(rowCheck)
                                    //         .find('input[type=checkbox]')
                                    //         .trigger('danitable:selectall', [ checked ]);
                                    //     });
                                    $(element).trigger('danitable:selectall', [ checked ]);
                                })
                            )
                            .append(
                                $('<div>', {
                                    class: 'danitable-checkbox-custom',
                                })
                            )
                    );
                return th;
            }
            /** Crea una columna */
            function createColumn(col, rows) {
                const text = getTextColumn(col);
                const th = $('<th>', { text });
                const items = getDistinct(col, rows);
                const dropDown = createDropdown(items, col);
                
                th.append(
                    $('<div>', { class: 'filter' })
                        .click(function (event) {
                            toggleDropdown(dropDown);
                            event.stopPropagation();
                        })
                        .append($('<i>', { class: 'fa fa-filter' }))
                );
                th.append(dropDown.hide());
                return th;
            }

            /** Muestra u oculta el dropdown */
            function toggleDropdown(dd) {
                $(dd)
                    .slideToggle(options.filterVelocity)

                if ($(dd).is(':visible')) {
                    $('.danitable-dropdown')
                        .not(dd)
                        .slideUp();
                }
                setInputFocus(dd);
                $(dd).data('open', !$(dd).data('open'));
            }

            /** Obtiene verdadero nombre de la columna */
            function getTextColumn(col) {
                const column = options.columns.find((c) => c.key === col);
                if (!column) {
                    return col;
                }
                return column.name || col;
            }

            /** Poner foco en input */
            function setInputFocus(dd) {
                $(dd).find('input[type=text]').focus();
            }

            /** Crea dropdown */
            function createDropdown(items, col) {
                danitableFilters[col] = { value: '', selection: [] };
                const select = createSelect(items, col);
                const dd = $('<div>', { class: 'danitable-dropdown' })
                    // Agrega input de busqueda
                    .append(
                        $('<input>', {
                            type: 'text',
                            placeholder: 'BUSCAR ' + col.toUpperCase() + '...',
                            keyup: function ($event) {
                                if ($event.keyCode === 27) {
                                    // Escape
                                    $(dd).slideUp();
                                    return;
                                }
                                const value = $event.target.value;
                                filterOptions(dd, value);
                                setFilterValue({ col, value });
                                const tempRows = getFilteredRows();
                                filterAnotherOptions(select, tempRows);
                                const filter = select.closest('th').find('.filter');
                                if (value === '') {
                                    filter.removeClass('active');
                                } else {
                                    filter.addClass('active');
                                }
                            },
                        })
                    )
                    .append(select);

                return dd;
            }

            /** Crea select */
            function createSelect(items, col) {
                let select = $('<div>', { class: 'danitable-select' });
                for (const item of items) {
                    select.append(createOption(item, col));
                }
                select.prepend(createSelectAllOption(col));
                return select;
            }

            /** Crea opción */
            function createOption(item, col) {
                danitableFilters[col].selection = [
                    ...(danitableFilters[col].selection || []),
                    item,
                ];
                let option = $('<div>', {
                    class: 'danitable-select-option',
                    data: { checked: true, option: item, col: col, hidden: false },
                })
                    // Check
                    .append(
                        $('<label>', {
                            class: 'danitable-select-option-check',
                        })
                            .append(
                                // Checkbox
                                $('<input>', {
                                    type: 'checkbox',
                                    checked: true,
                                }).change(function (event) {
                                    event.stopPropagation();
                                    $(option).data('checked', this.checked);
                                    setFilterSelection({ col, item, checked: this.checked });
                                    const tempRows = getFilteredRows();
                                    filterAnotherOptions(option.parent(), tempRows);
                                    checkIndeterminateStatusOnSelectAll(option);
                                    
                                })
                            )
                            .append(
                                $('<div>', {
                                    class: 'danitable-checkbox-custom',
                                })
                            )
                    )
                    // Label
                    .append(
                        $('<span>', {
                            class: 'danitable-select-option-label',
                            text: item,
                        })
                    );
                return option;
            }

            /** Filtra opciones de los demás filtros */
            function filterAnotherOptions(select, tempRows) {
                $('.danitable-select', element)
                    .not($(select))
                    .each(function (s, sel) {
                        const options = $(sel)
                            .children()
                            .not('.danitable-select-all-option');
                        for (const opt of options) {
                            const { option, checked, col } = $(opt).data();
                            if (!tempRows || !tempRows.length) {
                                $(opt).hide();
                            } else {
                                const exists = tempRows.find(tr => tr[col] === option);
                                if (exists) {
                                    $(opt).show();
                                } else {
                                    $(opt).hide();
                                }

                            }
                        }
                    });
            }

            function setFilterValue({ col, value }) {
                if (!danitableFilters[col]) {
                    danitableFilters[col] = {};
                }
                danitableFilters[col].value = value;
            }

            function setFilterSelection({ col, item, checked }) {
                if (!danitableFilters[col]) {
                    danitableFilters[col] = {};
                }
                if (!danitableFilters[col].selection) {
                    danitableFilters[col].selection = [];
                }
                const index = danitableFilters[col].selection.indexOf(item);
                if (index === -1 && checked) {
                    danitableFilters[col].selection.push(item);
                } else if (index > -1 && !checked) {
                    danitableFilters[col].selection.splice(index, 1);
                }

                
            }

            function getFilteredRows() {
                const filtered = [];
                danitableRows.forEach(row => {
                    const data = $(row).data();
                    const keys = Object.keys(data);
                    let ok = true;
                    for (let key of keys) {
                        const filter = danitableFilters[key];
                        const regex = new RegExp(filter.value, 'gi');
                        if (!regex.test(data[key]) || (filter.selection && !filter.selection.includes(data[key]))) {
                            ok = false;
                            break;
                        } 
                    }
                    if (ok) {
                        $(row).show();
                        filtered.push(data);
                    } else {
                        $(row).hide();
                    }
                });
                return filtered;
            }



            /** Crea opción para seleccionar todo */
            function createSelectAllOption(col) {
                let optionAll = $('<div>', {
                    class:
                        'danitable-select-option danitable-select-all-option',
                    data: {
                        checked: true,
                        option: 'TODOS',
                        col: col,
                        selectAll: true,
                    },
                })
                    .append(
                        $('<label>', {
                            class:
                                'danitable-select-option-check danitable-select-all-option-check',
                        })
                            .append(
                                // Checkbox
                                $('<input>', {
                                    type: 'checkbox',
                                    checked: true,
                                    indeterminate: false,
                                }).change(function () {
                                    const siblings = optionAll.siblings(
                                        ':visible'
                                    );
                                    for (const sibling of siblings) {
                                        const item = $(sibling).data('option');
                                        $(sibling)
                                            .data('checked', this.checked)
                                            .find('input[type="checkbox"]')
                                            .prop('checked', this.checked);
                                        
                                        setFilterSelection({ col, item, checked: this.checked });
                                    }
                                    const tempRows = getFilteredRows();
                                    filterAnotherOptions(optionAll.parent(), tempRows);
                                    // Filtro naranjo
                                    const filter = $(optionAll).closest('th').find('.filter');
                                    if (!this.checked) {
                                        filter.addClass('active');
                                    } else {
                                        filter.removeClass('active');
                                    }
                                })
                            )
                            .append(
                                $('<div>', {
                                    class: 'danitable-checkbox-custom',
                                })
                            )
                    )
                    // Label
                    .append(
                        $('<span>', {
                            class: 'danitable-select-option-label',
                            text: 'TODOS',
                        })
                    );
                return optionAll;
            }

            /** Filtrar opciones */
            function filterOptions(dropdown, value) {
                const select = $(dropdown).find('.danitable-select');
                const options = $(select).find('.danitable-select-option');
                // REGEX
                const regex = new RegExp(value, 'gi');
                for (const op of options) {
                    const { option, checked, selectAll, hiddenOutside } = $(op).data();
                                        
                    if (selectAll) {
                        continue;
                    }
                    if (regex.test(option) && !hiddenOutside) {
                        $(op).show();
                    } else {
                        $(op).hide();
                        
                    }
                }
            }

            /** Comprueba estado de selección si es indeterminado */
            function checkIndeterminateStatusOnSelectAll(option) {
                const options = $(option).siblings().addBack();
                let selected = 0,
                    unselected = 0;
                let indeterminate = false;
                for (const op of options) {
                    const { checked, selectAll } = $(op).data();
                    if (selectAll) {
                        continue;
                    }
                    if (checked) {
                        selected++;
                    } else {
                        unselected++;
                    }
                    if (selected > 0 && unselected > 0) {
                        indeterminate = true;
                        break;
                    }
                }

                option
                    .closest('.danitable-select')
                    .find('.danitable-select-all-option-check')
                    .find('input[type="checkbox"]')
                    .prop('indeterminate', indeterminate)
                    .prop('checked', selected > 0);

                // Filtro naranjo
                const filter = $(option).closest('th').find('.filter');
                if (indeterminate || unselected > 0) {
                    filter.addClass('active');
                } else {
                    filter.removeClass('active');
                }
            }

            /** FILAS */

            /** Crea Body */
            function createTBody(rows) {
                if (!rows || !rows.length) {
                    return '';
                }
                const tbody = $('<tbody>');
                const columns = getColumns(rows);
                
                danitableRows = [];

                // Agrega las filas
                for (const row of rows) {
                    // Agrega fila
                    tbody.append(createRow(row, columns));
                }
                return tbody;
            }

           


            /** Crea fila */
            function createRow(row, columns) {
                const tr = $('<tr>', { data: row, class: 'danitable-row' })
                .on(
                    'danitable:selectrow',
                    function (ev, checked) {
                        // Notificar cambio
                        // $(this).data('danitable_selected_row', checked);
                        $(element).trigger('danitable:select', [row, checked]);
                    }
                );
               
                // Inserta celda de selección
                tr.append(createSelectionableCell(row));
                // Recorre cada celda
                for (const col of columns) {
                    // Agrega celda
                    tr.append(createCell(row[col]));
                }
                danitableRows.push(tr);
                return tr;
            }

            /** Retorna si el checkbox parte chequeado o no */
            function isSelected(row) {
                const input = options.selectionInput;
                const selected = options.selected || [];
                if (!options.key || (!input && !selected.length)) {
                    return false;
                }
                const value = $(input).val();
                if (!value && !selected.length) return false;
                const ids = value.split(',');
                const key = options.key;
                const data = row[key];
                return ids.includes(data.toString()) || selected.includes(data.toString());

            }

            /** Crea celda seleccionable */
            function createSelectionableCell(row) {
                return $('<td>').append(
                    $('<label>', {
                        class:
                            'danitable-select-option-check danitable-select-option-row',
                    })
                        .append(
                            // Checkbox
                            $('<input>', {
                                type: 'checkbox',
                                checked: isSelected(row),
                            })
                                .change(function () {
                                    // Notifica a la row que está seleccionada o deseleccionada
                                    const _row = $(this).closest(
                                        '.danitable-row'
                                    );
                                    toggleSelectionRow(_row, $(this));
                                })
                                .on('danitable:selectall', function (
                                    ev,
                                    checked
                                ) {
                                    $(this).prop('checked', checked);
                                })
                        )
                        .append(
                            $('<div>', {
                                class: 'danitable-checkbox-custom',
                            })
                        )
                );
            }

            /** Selecciona o deselecciona una fila */
            function toggleSelectionRow(row, check) {
                $(row).trigger('danitable:selectrow', [
                    $(check).prop('checked'),
                ]);
            }
            /** Crea celda */
            function createCell(text) {
                return $('<td>').append($('<span>', { text }));
            }

            /** Función para fijar las columnas */
            function getColumns(data) {
                if (!data) {
                    return [];
                }
                // Validar que sea array
                const isArray = Array.isArray(data);
                if (!isArray) {
                    return [];
                }
                /** Obtiene el primer registro */
                const first = data[0];
                /** Valida que haya registro */
                if (!first) {
                    return [];
                }
                /** Obtiene las claves del objeto */
                const keys = Object.keys(first).filter(
                    (k) => !options.hidden.includes(k)
                );
                // TODO: Retornar claves sustitutas
                return keys;
            }

            try {
                initDanitable();
            } catch (error) {
                throw error;
            }
        });

        return this;
    };

    $.fn.obtenerSeleccion = function () {
        const elemData = $(this).data();
        const options = elemData.options;
        const selected = [];
        const rows = $(this).find('.danitable-row');
        for (const row of rows) {
            const data = $(row).data();
            const ck = $(row).find('input[type=checkbox]');
            if ($(row).is(':visible') && $(ck).is(':checked')) {
                selected.push(data[options.key]);
                continue;
            }
        }
        return selected;
    };

    // Parametros del plugin.
    $.fn.danitable.defaultOptions = {
        element_class: 'danitable',
        url: './data.json',
        headers: {},
        filterVelocity: 200,
        columns: [],
        hidden: [],
        key: 'id',
        title: 'DATOS',
        selectionInput: null,
        selected: [],
        postData: {}
    };

    /** */

    /** Función para obtener la data */
    function getJsonData(url, headers, postData) {
        return new Promise((resolve, reject) => {
            if (!url) {
                return reject('No se pudo obtener la data');
            }
            $.ajax({
                url: url,
                headers: headers,
                data: postData,
                success: function (data) {
                    resolve(data);
                },
                error: function (error) {
                    reject(
                        'Ocurrió un error al obtener los datos: ' +
                            error.statusText
                    );
                },
            });
        });
    }

    /** Función para obtener los filtros por columnas? */
    function getDistinct(col, rows) {
        return Array.from(new Set(rows.map((r) => r[col])));
    }
})(jQuery);
