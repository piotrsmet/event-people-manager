<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\AuthController;

Route::post('login', [AuthController::class, 'login']);

Route::apiResource('events', EventController::class);
Route::apiResource('shifts', ShiftController::class);

Route::middleware('auth:sanctum')->group(function () {
	Route::post('shifts/{shift}/apply', [ShiftController::class, 'apply']);
});
