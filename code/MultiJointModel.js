var S = 1.0;
var TX = 0.0, TY = 0.0, TZ = 0.0;
// Vertex shader program
var VSHADER_SOURCE =
    'uniform mat4 u_NormalMatrix;\n' +
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Normal;\n' +        // Normal
    'uniform mat4 u_MvpMatrix;\n' +
    'uniform vec3 u_LightColor;\n' +     // Light color
    'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
    'varying vec4 v_Color;\n' +

    'attribute vec2 a_TexCoord;\n' +
    'varying vec2 v_TexCoord;\n' +
    /*   'attribute vec2 a_transparent;\n' +
       'varying vec2 v_transparent;\n' +*/

    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    // Shading calculation to make the arm look three-dimensional
    '  vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));\n' + // Light direction
   // '  vec4 color = vec4(0.5, 0.5, 1.0, 0.5);\n' +  // Robot color
    '  v_TexCoord = a_TexCoord;\n' +

    '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
    '  float nDotL = max(dot(normal, lightDirection), 0.0);\n' +
    '  vec3 diffuse = u_LightColor * nDotL;\n' +/** color.rgb */
    '  v_Color = vec4(diffuse,0.0);\n' +/*, color.a*/

    '}\n';


// Fragment shader program
var FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform sampler2D u_Sampler;\n' +
    'varying vec2 v_TexCoord;\n' +
    'varying vec4 v_Color;\n' +
    'uniform vec4 u_fogColor;\n' +
    'uniform float u_fogAmount;\n' +


    'void main() {\n' +

    '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
    '  gl_FragColor = gl_FragColor + v_Color;\n' +
    '  gl_FragColor = mix(gl_FragColor, u_fogColor, u_fogAmount);\n' +
    '}\n';


var g_eyeX = 30;
var g_eyeY = 30;
var g_eyeZ = 30;


var ratio = 0.0;
var isOrtho = -1;
var g_near = 0, g_far = 200;

var theta = 45;
var pi_value = Math.PI;
var ra = Math.sqrt(g_eyeY * g_eyeY + g_eyeZ * g_eyeZ + g_eyeX * g_eyeX);

var phi = 45;

var fogColor = [0.5, 0.0, 0.0, 0.4];
var fogAmount = 0.7;

function initTextures(gl) {
    var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the Texture object');
        return null;
    }

    // Get storage location of u_Sampler
    var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (!u_Sampler) {
        console.log('Failed to get the storage location of u_Sampler');
        return null;
    }

    var image = new Image();  // Create image object
    if (!image) {
        console.log('Failed to create the Image object');
        return null;
    }

    // 处理图片加载完成之后的系列操作（图片的异步处理）
    image.onload = function () {
        // Write image data to texture object
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        // Pass the texure unit 0 to u_Sampler
        gl.uniform1i(u_Sampler, 0);

        // gl.bindTexture(gl.TEXTURE_2D, null); // Unbind the texture object
    };

    // Tell the browser to load an Image
    /*  image.src = '../resources/sky_cloud.jpg';*/
    image.src = '../resources/16.jpg';
    /* image.src = '../resources/8.jpg';*/
    return texture;
}
function main() {
    // Retrieve <canvas> element


    var canvas = document.getElementById('webgl');
    var W = watchChangeSize1();
    var H = watchChangeSize2();
    canvas.width = W;
    canvas.height = H;

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Set the vertex information
    var n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to set the vertex information');
        return;
    }

    // Set the clear color and enable the depth test

    /*  gl.enable(gl.DEPTH_TEST);*/
    gl.enable(gl.BLEND);
    // Set blending function
    gl.blendFunc(gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA);
    // Get the storage locations of uniform variables
    var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    // 雾化
    var fogColorLocation = gl.getUniformLocation(gl.program, "u_fogColor");
    var fogAmountLocation = gl.getUniformLocation(gl.program, "u_fogAmount");


    var program = gl.program; // Get program object
    program.a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    if (!u_MvpMatrix || !u_NormalMatrix || program.a_TexCoord < 0) {
        console.log('Failed to get the storage location');
        return;
    }
    // Set texture
    var texture = initTextures(gl);
    if (!texture) {
        console.log('Failed to intialize the texture.');
        return;
    }

    // Set the light color (white)
    gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
    // 雾化
    gl.uniform4fv(fogColorLocation, fogColor);
    gl.uniform1f(fogAmountLocation, fogAmount);
    // Set the light direction (in the world coordinate)
    //   var lightDirection = new Vector3([0.5, 3.0, 4.0]);
    //   lightDirection.normalize();     // Normalize
    //   gl.uniform3fv(u_LightDirection, lightDirection.elements);


    // 计算视图投影矩阵
    var viewProjMatrix = new Matrix4();
    ratio = canvas.width / canvas.height;

    // Register the event handler to be called on key press
    document.onkeydown = function (ev) {
        keydown(ev, gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix);
    };


    /* window.onresize=function(){
         changewin(gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix,canvas);
     }*/

    draw(gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix); // Draw the robot arm
}
/*function changewin(gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix,canvas){
    var W=watchChangeSize1();
    var H=watchChangeSize2();
    console.log(W);
    gl.viewport(0,0,W,H);
    return;
}*/
function watchChangeSize1() {
    //可视区的宽/高(DOM)
    /*var offsetWid = */return document.documentElement.clientWidth;
    /*var offsetHei = document.documentElement.clientHeight;*/
    //console.log(offsetWid);
    //console.log(offsetHei);
}
function watchChangeSize2() {
    //可视区的宽/高(DOM)
    /*var offsetWid = *//*return document.documentElement.clientWidth;
    var offsetHei =*/return document.documentElement.clientHeight;
}

var ANGLE_STEP = 3.0;    // 每次按键转动的角度
var g_arm1Angle = 90.0; // arm1的当前角度
var g_joint1Angle = 45.0; // joint1的当前角度
var g_joint2Angle = 0.0;  // joint2
var g_joint3Angle = 0.0;  // joint3

function keydown(ev, gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix) {
    switch (ev.keyCode) {
        case 40: // Up arrow key -> the positive rotation of joint1 around the z-axis
            if (g_joint1Angle < 135.0) g_joint1Angle += ANGLE_STEP;
            break;
        case 38: // Down arrow key -> the negative rotation of joint1 around the z-axis
            if (g_joint1Angle > -135.0) g_joint1Angle -= ANGLE_STEP;
            break;
        case 39: // Right arrow key -> the positive rotation of arm1 around the y-axis
            g_arm1Angle = (g_arm1Angle + ANGLE_STEP) % 360;
            break;
        case 37: // Left arrow key -> the negative rotation of arm1 around the y-axis
            g_arm1Angle = (g_arm1Angle - ANGLE_STEP) % 360;
            break;
        case 90: // 'ｚ'key -> the positive rotation of joint2
            g_joint2Angle = (g_joint2Angle + ANGLE_STEP) % 360;
            break;
        case 88: // 'x'key -> the negative rotation of joint2
            g_joint2Angle = (g_joint2Angle - ANGLE_STEP) % 360;
            break;
        case 86: // 'v'key -> the positive rotation of joint3
            if (g_joint3Angle < 60.0) g_joint3Angle = (g_joint3Angle + ANGLE_STEP) % 360;
            break;
        case 67: // 'c'key -> the nagative rotation of joint3
            if (g_joint3Angle > -60.0) g_joint3Angle = (g_joint3Angle - ANGLE_STEP) % 360;
            break;
        case 65: // A 绕Z轴 逆时针

            theta = theta + 0.1;

            break;
        case 68: // D 绕Z轴
            theta = theta - 0.1;
            break;

        case 87: // W 绕x轴

            phi = phi + 0.1;
            break;
        case 83: // S 绕x轴
            phi = phi - 0.1;
            break;

        case 80:
            isOrtho = -isOrtho;
            break;
        case 74:
            S = S + 0.1;
            break;
        case 76:
            S = S - 0.1;
            if (S < 0.1)
                S = 0.1;
            break;
        //平移
        case 49:
            TX = TX + 2.0;
            break;
        case 50:
            TX = TX - 2.0;
            break;
        case 51:
            TY = TY + 2.0;
            break;
        case 52:
            TY = TY - 2.0;
            break;
        case 53:
            TZ = TZ + 2.0;
            break;
        case 54:
            TZ = TZ - 2.0;
            break;
        case 55: // 7
            var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
            gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
            break;
        case 56: // 8 
            var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
            gl.uniform3f(u_LightColor, 0.5, 0.0, 0.5);
            break;
        case 57: // 9
            var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
            gl.uniform3f(u_LightColor, 0.0, 0.0, 0.0);
            break;

        case 70: //f
            var fogAmountLocation = gl.getUniformLocation(gl.program, "u_fogAmount");
            if(fogAmount>0.0)
            fogAmount = fogAmount - 0.1
            gl.uniform1f(fogAmountLocation, fogAmount);
            break;

        case 71: //g
            var fogAmountLocation = gl.getUniformLocation(gl.program, "u_fogAmount");
            if(fogAmount<1.0)
                fogAmount = fogAmount + 0.1
            gl.uniform1f(fogAmountLocation, fogAmount);
            break;


        default:
            return; // Skip drawing at no effective action
    }
    // Draw the robot arm
    draw(gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix);
}

function initVertexBuffers(gl) {
    // Coordinates（Cube which length of one side is 1 with the origin on the center of the bottom)
    var vertices = new Float32Array([
        0.5, 1.0, 0.5, -0.5, 1.0, 0.5, -0.5, 0.0, 0.5, 0.5, 0.0, 0.5, // v0-v1-v2-v3 front
        0.5, 1.0, 0.5, 0.5, 0.0, 0.5, 0.5, 0.0, -0.5, 0.5, 1.0, -0.5, // v0-v3-v4-v5 right
        0.5, 1.0, 0.5, 0.5, 1.0, -0.5, -0.5, 1.0, -0.5, -0.5, 1.0, 0.5, // v0-v5-v6-v1 up
        -0.5, 1.0, 0.5, -0.5, 1.0, -0.5, -0.5, 0.0, -0.5, -0.5, 0.0, 0.5, // v1-v6-v7-v2 left
        -0.5, 0.0, -0.5, 0.5, 0.0, -0.5, 0.5, 0.0, 0.5, -0.5, 0.0, 0.5, // v7-v4-v3-v2 down
        0.5, 0.0, -0.5, -0.5, 0.0, -0.5, -0.5, 1.0, -0.5, 0.5, 1.0, -0.5  // v4-v7-v6-v5 back
    ]);

    // Normal
    var normals = new Float32Array([
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, // v0-v1-v2-v3 front
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, // v0-v3-v4-v5 right
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, // v7-v4-v3-v2 down
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0  // v4-v7-v6-v5 back
    ]);
    // Texture coordinates
    var texCoords = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,    // v0-v1-v2-v3 front
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,    // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,    // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,    // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,    // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0     // v4-v7-v6-v5 back
    ]);
    // Indices of the vertices
    var indices = new Uint8Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // right
        8, 9, 10, 8, 10, 11,    // up
        12, 13, 14, 12, 14, 15,    // left
        16, 17, 18, 16, 18, 19,    // down
        20, 21, 22, 20, 22, 23     // back
    ]);

    // Write the vertex property to buffers (coordinates and normals)
    if (!initArrayBuffer(gl, 'a_Position', vertices, gl.FLOAT, 3)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', normals, gl.FLOAT, 3)) return -1;
    if (!initArrayBuffer(gl, 'a_TexCoord', texCoords, gl.FLOAT, 2)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;


    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);???
    // Write the indices to the buffer object
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

function initArrayBuffer(gl, attribute, data, type, num) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);

    return true;
}

// 变换坐标的矩阵
var g_modelMatrix = new Matrix4(), g_mvpMatrix = new Matrix4();

function draw(gl, n, viewProjMatrix, u_MvpMatrix, u_NormalMatrix) {

    viewProjMatrix = new Matrix4();
    //viewProjMatrix.setPerspective(50.0, ratio, 1.0, 100.0);
    if (isOrtho == 1) {
        // projectionMatrix = ortho(left, right, bottom, vtop, near, far);
        viewProjMatrix.setOrtho(-30, 30, -30, 30, g_near, g_far);
    } else {
        //projectionMatrix = perspective(fovy, aspect, near, far);
        viewProjMatrix.setPerspective(50.0, ratio, 1.0, 100.0);
    }

    //viewProjMatrix.lookAt(g_eyeX, g_eyeY, g_eyeZ, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);//(0,1,0)
    viewProjMatrix.lookAt(ra * Math.cos(phi) * Math.cos(theta), ra * Math.cos(phi) * Math.sin(theta), ra * Math.sin(phi), 0.0, 0.0, 0.0, 0.0, 0.0, Math.cos(phi));//(0,1,0)
    gl.clearColor(0.5, 0.0, 0.0, 0.4);
    /*   gl.clearColor(...fogColor);*/
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    /* gl.clear(gl.COLOR_BUFFER_BIT);*/
    /* gl.clearColor(0.5, 0.5, 1.0, 0.4);*/

    // 用以清空颜色缓冲区和深度缓冲区的背景颜色
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // base绘制
    var baseHeight = 2.0 * S;
    g_modelMatrix.setTranslate(0.0 + TX, -12.0 + TY, 0.0 + TZ);
    drawBox(gl, n, 15.0 * S, baseHeight, 15.0 * S, viewProjMatrix, u_MvpMatrix, u_NormalMatrix);

    // Arm1
    var arm1Length = 5.0 * S;
    g_modelMatrix.translate(0.0, baseHeight, 0.0);     // Move onto the base
    g_modelMatrix.rotate(g_arm1Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
    drawBox(gl, n, 2.0 * S, arm1Length, 2.0 * S, viewProjMatrix, u_MvpMatrix, u_NormalMatrix); // Draw

    // Arm2
    var arm2Length = 7.0 * S;
    g_modelMatrix.translate(0.0, arm1Length, 0.0);       // Move to joint1
    g_modelMatrix.rotate(g_joint1Angle, 0.0, 0.0, 1.0);  // Rotate around the z-axis
    drawBox(gl, n, 3.0 * S, arm2Length, 3.0 * S, viewProjMatrix, u_MvpMatrix, u_NormalMatrix); // Draw

    // A palm
    var palmLength = 2.0 * S;
    g_modelMatrix.translate(0.0, arm2Length, 0.0);       // Move to palm
    g_modelMatrix.rotate(g_joint2Angle, 0.0, 1.0, 0.0);  // Rotate around the y-axis
    drawBox(gl, n, 2.0 * S, palmLength, 10.0 * S, viewProjMatrix, u_MvpMatrix, u_NormalMatrix);  // Draw

    // Move to the center of the tip of the palm
    g_modelMatrix.translate(0.0, palmLength, 0.0);

    // Draw finger1
    pushMatrix(g_modelMatrix);
    g_modelMatrix.translate(0.0, 0.0, 2.0);
    g_modelMatrix.rotate(g_joint3Angle, 1.0, 0.0, 0.0);  // Rotate around the x-axis
    drawBox(gl, n, 1.0 * S, 3.0 * S, 1.0 * S, viewProjMatrix, u_MvpMatrix, u_NormalMatrix);
    g_modelMatrix = popMatrix();

    // Draw finger2
    g_modelMatrix.translate(0.0, 0.0, -2.0);
    g_modelMatrix.rotate(-g_joint3Angle, 1.0, 0.0, 0.0);  // Rotate around the x-axis
    drawBox(gl, n, 1.0 * S, 3.0 * S, 1.0 * S, viewProjMatrix, u_MvpMatrix, u_NormalMatrix);
}

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
    var m2 = new Matrix4(m);
    g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
    return g_matrixStack.pop();
}

var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

// Draw rectangular solid
function drawBox(gl, n, width, height, depth, viewProjMatrix, u_MvpMatrix, u_NormalMatrix) {
    pushMatrix(g_modelMatrix);   // Save the model matrix
    // Scale a cube and draw
    g_modelMatrix.scale(width, height, depth);
    // Calculate the model view project matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_mvpMatrix.elements);
    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(g_modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

    // Draw
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    g_modelMatrix = popMatrix();   // Retrieve the model matrix

}
