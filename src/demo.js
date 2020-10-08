$(document).ready(function() {
    // Declarar elemento e implementar danitable
    const myTable = $('#danitable');
    // Instanciar plugin
    myTable.danitable({ 
        // Url para consulta
        url: 'https://jsonplaceholder.typicode.com/posts',
        // Columna clave para obtener la selección
        key: 'id',
        // Agrega clase Css adicional
        element_class: 'danitable danitable-auto',
        // Input para cargar la primera seleccion
        selectionInput: $('#input-data'),
        selected: [ '1', '2', '3'],
        postData: { data: 1 }
    })
    // Para obtener las filas seleccionadas (ids) en el momento de la selección
    .on('changeSelection', (ev, selection, row, checked) => {
        console.log('changeSelection', selection);
        // Usar variable selection
        if (checked) {
            // console.log('Se ha seleccionado una fila', row);
        } else {
            // console.log('Se ha deseleccionado una fila', row);
        }
    });



    // Para obtener filas seleccionadas de un evento externo
    $('#danitable-boton').click(function () {
        // Instanciar al mismo objeto
        const selected = myTable.obtenerSeleccion();
        console.log('FILAS SELECCIONADAS: ', selected);

    })
});

