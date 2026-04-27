<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ShiftController;

Route::apiResource('events', EventController::class);
Route::apiResource('shifts', ShiftController::class);